/**
 * Recurring Pokémon set-logo backfill — extracted from
 * scripts/crawl-pokemon-set-logos-{bulbapedia,dextcg,pokellector}.ts, same
 * treatment as pokemon/image-crawl.ts: resumability moves from fs-cached
 * JSONL to a CronJobState cursor per source, and matches land in
 * CrawledImageCandidate (targetType: "set") instead of a
 * scripts/data/set-logos/*.json file waiting on a human `verified: true`
 * flip.
 *
 * Three sources, rotated one per invocation by `runPokemonSetLogoBackfillChunk`
 * (same rotation pattern as image-crawl.ts):
 *   - dextcg-jpn / dextcg-chs: one listing-page request each, so a full pass
 *     completes in a single chunk every time.
 *   - pokellector-ja: one listing-page request, same as dextcg.
 *   - bulbapedia: a MediaWiki category (hundreds of pages) — the only one
 *     that needs real cursor-based chunking across runs.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createPoliteFetcher, CrawlAbortedError } from "../../../../scripts/lib/polite-fetch";
import {
  mwApiUrl,
  extractTemplateBlock,
  parseTemplateParams,
  extractCaptionedLogoFiles,
  parseMultiLocaleField,
  stripWikiMarkup,
  extractNativeNameFromSetname,
  type MwCategoryMember,
} from "../../../../scripts/lib/mediawiki";
import { getCronCursor, recordCronSuccess, recordCronCircuitBroken, recordCronError } from "@/lib/automation/cron-job-state";
import { upsertImageCandidate } from "@/lib/automation/candidate-store";

export const SET_LOGO_BACKFILL_JOB_NAME = "pokemon-set-logo-backfill";
const SOURCES = ["dextcg-jpn", "dextcg-chs", "pokellector-ja", "bulbapedia"] as const;
type Source = (typeof SOURCES)[number];

interface RotationCursor {
  sourceIndex: number;
}

export interface SetLogoBackfillSummary {
  source: Source;
  matched: number;
  circuitBroken: boolean;
}

function normalizeName(text: string): string {
  return text.toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z0-9]+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// dextcg.com — one listing page per language. See
// scripts/crawl-pokemon-set-logos-dextcg.ts.
// ---------------------------------------------------------------------------

const DEXTCG_LANG_CONFIG = {
  jpn: { dbPrefix: "ja", slugPrefix: "jpn_", requireExactCode: true },
  chs: { dbPrefix: "zh-cn", slugPrefix: "scn_", requireExactCode: false },
} as const;

function parseDextcgCards(html: string) {
  const pattern =
    /href="\/expansions\/([a-z]+_[a-z0-9.]+)"[\s\S]*?logos\/[a-z0-9._]+\.png[\s\S]*?<h3[^>]*>([^<]*)<\/h3><p[^>]*>([^<]*)<\/p>[\s\S]*?<p[^>]*>([^<]*)<\/p>/g;
  const out: { slug: string; logoUrl: string; nameEn: string; cardCountText: string }[] = [];
  for (const m of html.matchAll(pattern)) {
    const [, slug, nameEn, , cardCountText] = m;
    out.push({
      slug,
      logoUrl: `https://static.dextcg.com/content/sets/logos/${slug}.png`,
      nameEn: nameEn.replace(/&amp;/g, "&").replace(/&#x27;/g, "'"),
      cardCountText,
    });
  }
  return out;
}
function parseCardCount(text: string): number | null {
  const m = /^(\d+)\s*Card/.exec(text);
  return m ? Number(m[1]) : null;
}

async function crawlDextcg(lang: "jpn" | "chs", politeGet: ReturnType<typeof createPoliteFetcher>): Promise<number> {
  const { dbPrefix, slugPrefix, requireExactCode } = DEXTCG_LANG_CONFIG[lang];
  const url = `https://dextcg.com/expansions?lang=${lang === "jpn" ? "japanese" : "chinese"}`;
  const res = await politeGet(url);
  if (res.status !== 200) return 0;

  const cards = parseDextcgCards(res.body).filter((c) => c.slug.startsWith(slugPrefix));
  const dbSets = await db.set.findMany({
    where: { id: { startsWith: `pokemon:${dbPrefix}:` } },
    select: { id: true, code: true, logoUrl: true, cardCount: true },
  });
  const byCode = new Map(dbSets.map((s) => [s.code.replace(new RegExp(`^${dbPrefix}:`), "").toUpperCase(), s]));

  let matched = 0;
  for (const card of cards) {
    const rawCode = card.slug.slice(slugPrefix.length).toUpperCase();
    const dextcgCardCount = parseCardCount(card.cardCountText);
    let dbSet = byCode.get(rawCode);
    if (!dbSet && !requireExactCode) dbSet = byCode.get(`${rawCode}C`);
    if (!dbSet || dbSet.logoUrl) continue;
    if (
      !requireExactCode &&
      dextcgCardCount != null &&
      dbSet.cardCount != null &&
      Math.abs(dextcgCardCount - dbSet.cardCount) > 2
    ) {
      continue; // never trust a code-lookalike alone — see the original script's header
    }

    await upsertImageCandidate({
      source: `dextcg.com-${lang}`,
      targetType: "set",
      setId: dbSet.id,
      logoUrl: card.logoUrl,
      sourceUrl: `https://dextcg.com/expansions/${card.slug}`,
    });
    matched++;
  }
  return matched;
}

// ---------------------------------------------------------------------------
// jp.pokellector.com — one listing page. See
// scripts/crawl-pokemon-set-logos-pokellector.ts.
// ---------------------------------------------------------------------------

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
function parsePokellectorSetButtons(html: string) {
  const pattern =
    /<a class="button" name="([^"]*)" href="(\/[^"]+)" title="([^"]*) Set"><img src="(https:\/\/den-media\.pokellector\.com\/logos\/[^"]+)">/g;
  const out: { code: string; slug: string; nameEn: string; logoUrl: string }[] = [];
  for (const m of html.matchAll(pattern)) {
    const [, code, slug, rawNameEn, logoUrl] = m;
    if (!code) continue;
    out.push({ code, slug, nameEn: decodeHtmlEntities(rawNameEn), logoUrl });
  }
  return out;
}

async function crawlPokellector(politeGet: ReturnType<typeof createPoliteFetcher>): Promise<number> {
  const res = await politeGet("https://jp.pokellector.com/sets");
  if (res.status !== 200) return 0;
  const buttons = parsePokellectorSetButtons(res.body);

  // A code appearing on more than one button is a real, confirmed error on
  // pokellector's own listing (see the original script's header) — never
  // auto-match either occurrence.
  const codeOccurrences = new Map<string, number>();
  for (const b of buttons) codeOccurrences.set(b.code.toUpperCase(), (codeOccurrences.get(b.code.toUpperCase()) ?? 0) + 1);

  const dbSets = await db.set.findMany({ where: { id: { startsWith: "pokemon:ja:" } }, select: { id: true, code: true, logoUrl: true } });
  const byCode = new Map(dbSets.map((s) => [s.code.replace(/^ja:/, "").toUpperCase(), s]));

  let matched = 0;
  for (const button of buttons) {
    const code = button.code.toUpperCase();
    if ((codeOccurrences.get(code) ?? 0) > 1) continue;
    const dbSet = byCode.get(code);
    if (!dbSet || dbSet.logoUrl) continue;

    await upsertImageCandidate({
      source: "jp.pokellector.com-set-logo",
      targetType: "set",
      setId: dbSet.id,
      logoUrl: button.logoUrl,
      sourceUrl: `https://jp.pokellector.com${button.slug}`,
    });
    matched++;
  }
  return matched;
}

// ---------------------------------------------------------------------------
// Bulbapedia — a MediaWiki category with hundreds of set pages, the one
// source that needs real cross-run chunking. See
// scripts/crawl-pokemon-set-logos-bulbapedia.ts for the full matching-
// strategy writeup (native-script name, SET A/B split, normalized nameEn +
// card-count corroboration) — reproduced here in the same order.
// ---------------------------------------------------------------------------

const BULBAPEDIA_CATEGORY = "Category:Pokémon Trading Card Game expansions";
const BULBAPEDIA_TARGET_LANGS = ["ja", "zh-tw", "ko"] as const;
type BulbapediaLang = (typeof BULBAPEDIA_TARGET_LANGS)[number];
const BULBAPEDIA_PAGES_PER_CHUNK = 8;

interface BulbapediaCursor {
  /** Undiscovered/unprocessed category members, oldest-first; refilled once empty. */
  pending: MwCategoryMember[];
}

interface ParsedLocaleEntry {
  lang: BulbapediaLang;
  nameEn: string;
  nativeName: string | null;
  cardCount: number | null;
  logoFile: string | null;
}

function parseIntOrNull(text: string | undefined): number | null {
  if (!text) return null;
  const digits = text.match(/\d+/);
  return digits ? Number(digits[0]) : null;
}

function parseBulbapediaPageLocales(title: string, wikitext: string): ParsedLocaleEntry[] {
  const block = extractTemplateBlock(wikitext, "TCGExpansionInfobox");
  if (!block) return [];
  const params = parseTemplateParams(block);
  const out: ParsedLocaleEntry[] = [];

  const hasEnRelease = params.enrelease && params.enrelease.toUpperCase() !== "N/A";
  const hasJa = Boolean(params.jasetname);

  if (hasJa) {
    out.push({
      lang: "ja",
      nameEn: stripWikiMarkup(params.transsetname || params.setname || ""),
      nativeName: params.jasetname || null,
      cardCount: parseIntOrNull(params.jacards),
      logoFile: hasEnRelease ? null : params.setlogo || null,
    });
  } else if (/\(KTCG\)$/.test(title)) {
    const rawSetname = params.setname || "";
    out.push({
      lang: "ko",
      nameEn: stripWikiMarkup(rawSetname.split(/<br ?\/?>/i)[0]),
      nativeName: extractNativeNameFromSetname(rawSetname),
      cardCount: parseIntOrNull(params.cards),
      logoFile: params.setlogo || null,
    });
  } else if (/\(ATCG\)$/.test(title)) {
    const locales = params.release ? parseMultiLocaleField(params.release) : new Map<string, string>();
    const hasTraditionalChinese = [...locales.keys()].some((k) => k.includes("chinese"));
    if (hasTraditionalChinese || locales.size === 0) {
      const captioned = extractCaptionedLogoFiles(wikitext);
      const logoFile = captioned.get("chinese") ?? captioned.get("traditional") ?? (params.setlogo || null);
      const rawSetname = params.setname || "";
      out.push({
        lang: "zh-tw",
        nameEn: stripWikiMarkup(rawSetname.split(/<br ?\/?>/i)[0]),
        nativeName: extractNativeNameFromSetname(rawSetname),
        cardCount: parseIntOrNull(params.cards),
        logoFile,
      });
    }
  }
  return out.filter((e) => e.nameEn);
}

function bulbapediaPageUrl(title: string): string {
  return `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

async function fetchBulbapediaImageUrl(filename: string, politeGet: ReturnType<typeof createPoliteFetcher>): Promise<string | null> {
  const url = mwApiUrl({ action: "query", titles: `File:${filename}`, prop: "imageinfo", iiprop: "url" });
  const res = await politeGet(url);
  if (res.status !== 200) return null;
  try {
    const json = JSON.parse(res.body);
    const page = Object.values(json.query?.pages ?? {})[0] as { imageinfo?: { url: string }[] } | undefined;
    return page?.imageinfo?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

async function fetchAllBulbapediaCategoryMembers(politeGet: ReturnType<typeof createPoliteFetcher>): Promise<MwCategoryMember[]> {
  const members: MwCategoryMember[] = [];
  let cmcontinue: string | undefined;
  do {
    const url = mwApiUrl({
      action: "query",
      list: "categorymembers",
      cmtitle: BULBAPEDIA_CATEGORY,
      cmlimit: "500",
      cmnamespace: "0",
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    const res = await politeGet(url);
    if (res.status !== 200) break;
    const json = JSON.parse(res.body);
    members.push(...(json.query?.categorymembers ?? []));
    cmcontinue = json.continue?.cmcontinue;
  } while (cmcontinue);
  return members.filter((m) => /\((?:TCG|ATCG|KTCG)\)$/.test(m.title));
}

async function crawlBulbapediaChunk(
  cursor: BulbapediaCursor | null,
  politeGet: ReturnType<typeof createPoliteFetcher>
): Promise<{ nextCursor: BulbapediaCursor; matched: number; wrapped: boolean }> {
  let pending = cursor?.pending;
  let wrapped = false;
  if (!pending || pending.length === 0) {
    pending = await fetchAllBulbapediaCategoryMembers(politeGet);
    wrapped = true;
  }

  const batch = pending.slice(0, BULBAPEDIA_PAGES_PER_CHUNK);
  const rest = pending.slice(batch.length);

  const dbSets = await db.set.findMany({
    where: { gameId: "pokemon", id: { startsWith: "pokemon:" } },
    select: { id: true, code: true, name: true, nameEn: true, logoUrl: true, cardCount: true },
  });
  type DbSet = (typeof dbSets)[number];
  const byLangByNormalizedName = new Map<BulbapediaLang, Map<string, DbSet[]>>();
  const byLangByNativeName = new Map<BulbapediaLang, Map<string, DbSet[]>>();
  for (const lang of BULBAPEDIA_TARGET_LANGS) {
    byLangByNormalizedName.set(lang, new Map());
    byLangByNativeName.set(lang, new Map());
  }
  for (const set of dbSets) {
    const lang = BULBAPEDIA_TARGET_LANGS.find((l) => set.code.startsWith(`${l}:`));
    if (!lang) continue;
    if (set.nameEn) {
      const key = normalizeName(set.nameEn);
      const bucket = byLangByNormalizedName.get(lang)!;
      bucket.set(key, [...(bucket.get(key) ?? []), set]);
    }
    const nativeBucket = byLangByNativeName.get(lang)!;
    nativeBucket.set(set.name, [...(nativeBucket.get(set.name) ?? []), set]);
  }

  function findSetABSplit(lang: BulbapediaLang, nameEn: string): [DbSet, DbSet] | null {
    const bucket = byLangByNormalizedName.get(lang)!;
    const a = bucket.get(normalizeName(`${nameEn} SET A`));
    const b = bucket.get(normalizeName(`${nameEn} SET B`));
    if (a?.length === 1 && b?.length === 1) return [a[0], b[0]];
    return null;
  }

  let matched = 0;
  for (const page of batch) {
    const url = mwApiUrl({ action: "parse", pageid: String(page.pageid), prop: "wikitext", section: "0" });
    const res = await politeGet(url);
    if (res.status !== 200) continue;
    let wikitext: string | null;
    try {
      wikitext = JSON.parse(res.body)?.parse?.wikitext?.["*"] ?? null;
    } catch {
      wikitext = null;
    }
    if (!wikitext) continue;

    for (const parsed of parseBulbapediaPageLocales(page.title, wikitext)) {
      if (!parsed.logoFile) continue;
      const logoUrl = await fetchBulbapediaImageUrl(parsed.logoFile, politeGet);
      if (!logoUrl) continue;

      const emit = async (dbSet: DbSet) => {
        if (dbSet.logoUrl) return;
        await upsertImageCandidate({
          source: "bulbapedia.bulbagarden.net",
          targetType: "set",
          setId: dbSet.id,
          logoUrl,
          sourceUrl: bulbapediaPageUrl(page.title),
        });
        matched++;
      };

      const nativeMatches = parsed.nativeName ? byLangByNativeName.get(parsed.lang)!.get(parsed.nativeName) ?? [] : [];
      if (nativeMatches.length === 1) {
        await emit(nativeMatches[0]);
        continue;
      }
      const split = findSetABSplit(parsed.lang, parsed.nameEn);
      if (split) {
        await emit(split[0]);
        await emit(split[1]);
        continue;
      }
      const matches = byLangByNormalizedName.get(parsed.lang)!.get(normalizeName(parsed.nameEn)) ?? [];
      if (matches.length !== 1) continue; // no match or ambiguous — never guess
      const dbSet = matches[0];
      if (parsed.cardCount != null && dbSet.cardCount != null && Math.abs(parsed.cardCount - dbSet.cardCount) > 2) continue;
      await emit(dbSet);
    }
  }

  return { nextCursor: { pending: rest }, matched, wrapped };
}

// ---------------------------------------------------------------------------
// Rotation entry point
// ---------------------------------------------------------------------------

export async function runPokemonSetLogoBackfillChunk(): Promise<SetLogoBackfillSummary> {
  const rotation = (await getCronCursor<RotationCursor>(SET_LOGO_BACKFILL_JOB_NAME)) ?? { sourceIndex: 0 };
  const source = SOURCES[rotation.sourceIndex % SOURCES.length];
  const sourceJobName = `${SET_LOGO_BACKFILL_JOB_NAME}:${source}`;
  const politeGet = createPoliteFetcher();

  try {
    let matched = 0;
    if (source === "dextcg-jpn") matched = await crawlDextcg("jpn", politeGet);
    else if (source === "dextcg-chs") matched = await crawlDextcg("chs", politeGet);
    else if (source === "pokellector-ja") matched = await crawlPokellector(politeGet);
    else {
      const cursor = await getCronCursor<BulbapediaCursor>(sourceJobName);
      const result = await crawlBulbapediaChunk(cursor, politeGet);
      matched = result.matched;
      await recordCronSuccess(sourceJobName, result.nextCursor as unknown as Prisma.InputJsonValue, {
        matched,
        wrapped: result.wrapped,
      });
      await recordCronSuccess(SET_LOGO_BACKFILL_JOB_NAME, { sourceIndex: (rotation.sourceIndex + 1) % SOURCES.length }, {
        source,
        matched,
      });
      return { source, matched, circuitBroken: false };
    }

    await recordCronSuccess(sourceJobName, null, { matched });
    await recordCronSuccess(SET_LOGO_BACKFILL_JOB_NAME, { sourceIndex: (rotation.sourceIndex + 1) % SOURCES.length }, {
      source,
      matched,
    });
    return { source, matched, circuitBroken: false };
  } catch (err) {
    if (err instanceof CrawlAbortedError) {
      await recordCronCircuitBroken(sourceJobName, err.message);
      await recordCronSuccess(SET_LOGO_BACKFILL_JOB_NAME, { sourceIndex: (rotation.sourceIndex + 1) % SOURCES.length }, {
        source,
        circuitBroken: true,
      });
      return { source, matched: 0, circuitBroken: true };
    }
    await recordCronError(sourceJobName, (err as Error).message);
    await recordCronError(SET_LOGO_BACKFILL_JOB_NAME, (err as Error).message);
    throw err;
  }
}
