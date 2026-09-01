/**
 * Backfills Set.logoUrl (and a candidate Set.nameEn) for Traditional Chinese
 * (zh-tw) and Korean (ko) Pokémon sets from Bulbapedia
 * (bulbapedia.bulbagarden.net) — languages NONE of the existing crawlers
 * cover: crawl-pokemon-set-logos-pokellector.ts only mirrors EN+JA (no
 * tw./kr.pokellector.com), and crawl-pokemon-set-logos-dextcg.ts only has
 * `jpn`/`chs` (Simplified Chinese) listings. See
 * scripts/data/pokemon-set-logos.ts's header — zh-tw and ko set logos have
 * had zero coverage until now.
 *
 * Also crawls `ja` as a cross-check against the existing verified
 * pokellector-ja.json/dextcg-ja.json, since Bulbapedia's JA-only set pages
 * (the ones with no simultaneous English release, e.g. Abyss Eye (TCG)) name
 * their own logo unambiguously — see the `derive` matching notes below for
 * why *dual*-release pages (Crown Zenith-style) are NOT used as a JA logo
 * source here.
 *
 * Why Bulbapedia: unlike every other source in this repo, it's a public
 * MediaWiki — `action=parse&prop=wikitext` returns the actual wikitext an
 * editor typed, and every TCG set page carries a `{{TCGExpansionInfobox}}`
 * template with clean key=value fields (native name, `transsetname` — the
 * English translation, logo filename, card count, release date per
 * language). No HTML/DOM scraping, no CSS-selector drift risk. See
 * scripts/lib/mediawiki.ts for the wikitext parsing helpers.
 *
 * Confirmed live page shapes this crawler has to handle (all under
 * Category:Pokémon Trading Card Game expansions):
 *   - "<Name> (TCG)", dual EN+JA release (e.g. Crown Zenith): `setlogo` is
 *     the EN/International logo — NOT trusted as a JA source (no reliable
 *     per-language logo field on these pages), only `transsetname`/
 *     `jasetname` would be usable there, and this crawler is logo-focused
 *     so these pages just aren't crawled as JA sources at all.
 *   - "<Name> (TCG)", JA-only (e.g. Abyss Eye): `ensetnum`/`enrelease` are
 *     "N/A", `setlogo` unambiguously IS the JA logo.
 *   - "<Name> (ATCG)", Traditional Chinese/Thai/Indonesian catch-up sets
 *     (e.g. Sword & Shield): `release` bundles multiple bolded locales on
 *     one line, `setlogo` is the primary (usually zh-tw) logo, secondary
 *     locales' logos are inline `[[File:...|Thai logo]]`-style embeds
 *     outside the infobox. Only the Traditional Chinese sub-entry is used
 *     — Thai/Indonesian aren't languages this catalog tracks at all.
 *   - "<Name> (KTCG)", Korean-only (e.g. Another World): flat `setname`/
 *     `cards`/`setnum`/`release`/`setlogo`, no per-language prefixes needed
 *     since the whole page is one locale. `setlogo` is sometimes blank
 *     (older sets Bulbapedia hasn't sourced a logo image for) — those go to
 *     review, not guessed at.
 *
 * Matching to a DB Set row is name-based, not code-based: Bulbapedia's own
 * set-symbol letters and tcgdex's internal Set.code suffixes were confirmed
 * NOT to correspond (see scripts/data/pokemon-set-translations.ts's ko/zh-tw
 * entries, which reuse the EN/JA-era tcgdex codes like "CS1a" — nothing like
 * Bulbapedia's own F/T/I-style set-symbol letters). `derive` tries three
 * strategies in order, falling through only when the stronger one can't
 * resolve to exactly one row:
 *
 *   1. Native-script name exact equality. Korean (KTCG) and some ATCG pages'
 *      `setname` field carries a `<br>`-separated native-script segment
 *      alongside the English one (e.g. "Burning Confrontation<br>불꽃 튀는
 *      대결") — matched against Set.name, which is always the source
 *      provider's own native-script title. This has no translation-wording
 *      ambiguity (unlike nameEn below), so no card-count corroboration is
 *      needed. On ATCG pages the segment isn't reliably Traditional Chinese
 *      specifically (a few put the Indonesian name there instead) — harmless
 *      either way, since exact equality against a wrong-language string
 *      just fails to match rather than mismatching.
 *   2. Combined-article "SET A"/"SET B" split. Bulbapedia's ATCG articles
 *      describe some releases (e.g. Sword & Shield) as ONE combined product
 *      — one page, one logo, one combined card count — while this catalog
 *      seeds each half as its own Set row named "<name> SET A"/"<name> SET
 *      B" (confirmed live: "Sword & Shield SET A"/"SET B" exist as separate
 *      zh-tw rows). When both halves resolve to exactly one row each, both
 *      get the page's one logo image.
 *   3. Normalized Set.nameEn equality, corroborated by card count — the
 *      original fallback. scripts/data/pokemon-set-translations.ts already
 *      has a hand-curated English name for most ko/zh-tw sets, and
 *      Bulbapedia's `transsetname`/`setname` independently aims at the same
 *      real product name, but the two are separately-written translations
 *      of the same native title and confirmed (live) to sometimes word it
 *      differently — e.g. Bulbapedia's "Double Burst" vs. whatever this
 *      catalog's hand table calls the equivalent set — so this is treated as
 *      the weakest signal and gated on card count agreeing too.
 *
 * Zero or ambiguous matches at every strategy go to review, never guessed —
 * same "guard, don't guess" posture as crawl-pokemon-set-logos-dextcg.ts's
 * zh-cn code-drift handling. A page matching no Set row at all is common and
 * expected: it usually means Bulbapedia has documented a set our
 * tcgdex-seeded catalog doesn't have yet (including announced-but-unreleased
 * sets, or — confirmed live for a few Korean DP-era sets like "Burning
 * Confrontation" — a set that simply predates this catalog's KO coverage
 * entirely) — nothing is lost by that, since wikitext is cached and `derive`
 * can just be re-run for free once the Set row exists.
 *
 *   npx tsx scripts/crawl-pokemon-set-logos-bulbapedia.ts index
 *   npx tsx scripts/crawl-pokemon-set-logos-bulbapedia.ts crawl [--only=<title substring>]
 *   npx tsx scripts/crawl-pokemon-set-logos-bulbapedia.ts derive
 *
 * Always writes scripts/data/set-logos/bulbapedia-<lang>.json (lang: ja,
 * zh-tw, ko) with verified:false — flip each only after spot-checking a
 * handful of its entries against the live Bulbapedia pages linked in
 * sourceUrl, then wire it into CRAWLED_LOGO_FILES / CRAWLED_NAME_FILES in
 * scripts/backfill-set-logo-url.ts / scripts/backfill-set-name-en.ts.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "@/lib/db";
import { createPoliteFetcher, CrawlAbortedError } from "./lib/polite-fetch";
import { openCrawlCache, type CrawlRecord } from "./lib/crawl-cache";
import {
  mwApiUrl,
  extractTemplateBlock,
  parseTemplateParams,
  extractCaptionedLogoFiles,
  parseMultiLocaleField,
  stripWikiMarkup,
  extractNativeNameFromSetname,
  type MwCategoryMember,
} from "./lib/mediawiki";
import type { SetLogoEntry, SetLogoFile, SetLogoReviewEntry, SetLogoReviewFile } from "./data/set-logos/types";

const CATEGORY = "Category:Pokémon Trading Card Game expansions";
const CACHE_NAME = "pokemon-set-logos-bulbapedia-pages";
const CACHE_DIR = path.join(process.cwd(), "scripts", ".cache");
const SETS_INDEX_FILE = path.join(CACHE_DIR, "pokemon-set-logos-bulbapedia-index.json");
const IMAGE_URL_CACHE_FILE = path.join(CACHE_DIR, "pokemon-set-logos-bulbapedia-images.json");
const OUT_DIR = path.join(process.cwd(), "scripts", "data", "set-logos");

const TARGET_LANGS = ["ja", "zh-tw", "ko"] as const;
type TargetLang = (typeof TARGET_LANGS)[number];

const politeGet = createPoliteFetcher();

interface PageRecord extends CrawlRecord {
  title: string;
  wikitext: string | null; // null when the page had no parseable wikitext
}

// ---------------------------------------------------------------------------
// index

async function index() {
  const members: MwCategoryMember[] = [];
  let cmcontinue: string | undefined;
  do {
    const url = mwApiUrl({
      action: "query",
      list: "categorymembers",
      cmtitle: CATEGORY,
      cmlimit: "500",
      cmnamespace: "0", // article namespace only — excludes User:/Talk: drafts
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    const res = await politeGet(url);
    if (res.status !== 200) throw new Error(`GET categorymembers -> ${res.status}`);
    const json = JSON.parse(res.body);
    members.push(...(json.query?.categorymembers ?? []));
    cmcontinue = json.continue?.cmcontinue;
  } while (cmcontinue);

  // Only set-article pages (title ends in one of the three infobox
  // suffixes) — the category also holds a couple of "List of ..." overview
  // articles and stray User: drafts that a namespace=0 filter alone doesn't
  // catch when a draft happens to sit in article space.
  const setPages = members.filter((m) => /\((?:TCG|ATCG|KTCG)\)$/.test(m.title));

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(SETS_INDEX_FILE, JSON.stringify(setPages, null, 2));
  console.log(`Indexed ${setPages.length} set pages (of ${members.length} category members) -> ${path.relative(process.cwd(), SETS_INDEX_FILE)}`);
}

// ---------------------------------------------------------------------------
// crawl

async function crawl(only?: string) {
  if (!fs.existsSync(SETS_INDEX_FILE)) {
    throw new Error(`${SETS_INDEX_FILE} not found — run "index" first.`);
  }
  const pages: MwCategoryMember[] = JSON.parse(fs.readFileSync(SETS_INDEX_FILE, "utf-8"));
  const targets = only ? pages.filter((p) => p.title.toLowerCase().includes(only.toLowerCase())) : pages;

  const cache = openCrawlCache<PageRecord>(CACHE_NAME);
  console.log(`${targets.length} pages to consider, ${cache.seen.size} already cached.`);

  let fetched = 0;
  try {
    for (const page of targets) {
      if (cache.seen.has(page.pageid)) continue;
      const url = mwApiUrl({ action: "parse", pageid: String(page.pageid), prop: "wikitext", section: "0" });
      const res = await politeGet(url);
      let wikitext: string | null = null;
      if (res.status === 200) {
        try {
          wikitext = JSON.parse(res.body)?.parse?.wikitext?.["*"] ?? null;
        } catch {
          wikitext = null;
        }
      }
      cache.append({ id: page.pageid, status: res.status, title: page.title, wikitext });
      fetched += 1;
      if (fetched % 25 === 0) console.log(`  ...${fetched}/${targets.length}`);
    }
  } catch (err) {
    if (err instanceof CrawlAbortedError) {
      console.error(`\n${err.message}\nCached ${fetched} pages this run before aborting — safe to re-run "crawl" later to resume.`);
      cache.close();
      process.exitCode = 1;
      return;
    }
    throw err;
  }
  cache.close();
  console.log(`Fetched ${fetched} new pages this run.`);

  await resolveImageUrls(cache);
}

/** Batch-resolves every `setlogo`/captioned-logo filename referenced across
 *  the cached pages to a real CDN URL via one imageinfo query per 50 files,
 *  caching the result so `derive` never has to hit the network. */
async function resolveImageUrls(cache: ReturnType<typeof openCrawlCache<PageRecord>>) {
  const filenames = new Set<string>();
  for (const rec of cache.all()) {
    if (!rec.wikitext) continue;
    for (const entry of parsePageLocales(rec.title, rec.wikitext)) {
      if (entry.logoFile) filenames.add(entry.logoFile);
    }
  }

  const existing: Record<string, string> = fs.existsSync(IMAGE_URL_CACHE_FILE)
    ? JSON.parse(fs.readFileSync(IMAGE_URL_CACHE_FILE, "utf-8"))
    : {};
  const toResolve = [...filenames].filter((f) => !(f in existing));
  if (toResolve.length === 0) {
    console.log("Image URLs: nothing new to resolve.");
    return;
  }
  console.log(`Resolving ${toResolve.length} logo image URLs...`);

  for (let i = 0; i < toResolve.length; i += 50) {
    const chunk = toResolve.slice(i, i + 50);
    const titles = chunk.map((f) => `File:${f}`).join("|");
    const url = mwApiUrl({ action: "query", titles, prop: "imageinfo", iiprop: "url" });
    const res = await politeGet(url);
    if (res.status !== 200) continue;
    const json = JSON.parse(res.body);
    const pages = Object.values(json.query?.pages ?? {}) as Array<{
      title: string;
      imageinfo?: Array<{ url: string }>;
    }>;
    for (const p of pages) {
      const filename = p.title.replace(/^File:/, "");
      const fileUrl = p.imageinfo?.[0]?.url;
      if (fileUrl) existing[filename] = fileUrl;
    }
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(IMAGE_URL_CACHE_FILE, JSON.stringify(existing, null, 2));
  const resolvedCount = toResolve.filter((f) => f in existing).length;
  console.log(`Resolved ${resolvedCount}/${toResolve.length} new URLs -> ${path.relative(process.cwd(), IMAGE_URL_CACHE_FILE)}`);
}

// ---------------------------------------------------------------------------
// shared parsing: one cached page -> zero or more per-language candidate entries

interface ParsedLocaleEntry {
  lang: TargetLang;
  nameEn: string;
  /** Native-script name (Korean/Chinese), when the page's `setname` field
   *  carries a second `<br>`-separated segment. A stronger join key than
   *  `nameEn` since it isn't subject to two sources translating differently
   *  — see extractNativeNameFromSetname's doc comment. */
  nativeName: string | null;
  cardCount: number | null;
  logoFile: string | null;
}

function parseIntOrNull(text: string | undefined): number | null {
  if (!text) return null;
  const digits = text.match(/\d+/);
  return digits ? Number(digits[0]) : null;
}

function normalizeName(text: string): string {
  return text.toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Parses one page's wikitext into candidate per-language entries. Pure
 *  function, no network/DB — shared by resolveImageUrls (to enumerate
 *  filenames) and derive (to actually match/emit). */
function parsePageLocales(title: string, wikitext: string): ParsedLocaleEntry[] {
  const block = extractTemplateBlock(wikitext, "TCGExpansionInfobox");
  if (!block) return [];
  const params = parseTemplateParams(block);
  const out: ParsedLocaleEntry[] = [];

  const hasEnRelease = params.enrelease && params.enrelease.toUpperCase() !== "N/A";
  const hasJa = Boolean(params.jasetname);

  if (hasJa) {
    // Dual-release pages (Crown Zenith-style) don't carry a reliable
    // per-language logo field — `setlogo` there is the EN/International
    // logo, not JA's. Only JA-only pages (no real EN release) have
    // `setlogo` unambiguously pointing at the JA logo.
    out.push({
      lang: "ja",
      nameEn: stripWikiMarkup(params.transsetname || params.setname || ""),
      // Dual-release pages don't carry jasetname as a separate <br> segment
      // of `setname` (that's a JA-script name already, not worth a second
      // native-name path here) — jasetname itself IS the native name.
      nativeName: params.jasetname || null,
      cardCount: parseIntOrNull(params.jacards),
      logoFile: hasEnRelease ? null : params.setlogo || null,
    });
  } else if (/\(KTCG\)$/.test(title)) {
    const rawSetname = params.setname || "";
    const nameEn = stripWikiMarkup(rawSetname.split(/<br ?\/?>/i)[0]);
    out.push({
      lang: "ko",
      nameEn,
      nativeName: extractNativeNameFromSetname(rawSetname),
      cardCount: parseIntOrNull(params.cards),
      logoFile: params.setlogo || null,
    });
  } else if (/\(ATCG\)$/.test(title)) {
    const locales = params.release ? parseMultiLocaleField(params.release) : new Map<string, string>();
    const hasTraditionalChinese = [...locales.keys()].some((k) => k.includes("chinese"));
    if (hasTraditionalChinese || locales.size === 0) {
      const captioned = extractCaptionedLogoFiles(wikitext);
      // Primary `setlogo` is trusted as zh-tw's own only when there's no
      // separate "chinese"-captioned inline image to prefer instead.
      const logoFile =
        captioned.get("chinese") ?? captioned.get("traditional") ?? (params.setlogo || null);
      const rawSetname = params.setname || "";
      out.push({
        lang: "zh-tw",
        nameEn: stripWikiMarkup(rawSetname.split(/<br ?\/?>/i)[0]),
        // Best-effort: the <br> segment on an ATCG page isn't reliably
        // Traditional Chinese specifically (some pages put the Indonesian
        // or a differently-scripted name there instead — see
        // extractNativeNameFromSetname's doc comment). Matching is exact-
        // equality only, so a wrong-language segment just fails to match
        // anything rather than causing a bad pairing.
        nativeName: extractNativeNameFromSetname(rawSetname),
        cardCount: parseIntOrNull(params.cards),
        logoFile,
      });
    }
    // Thai/Indonesian sub-entries deliberately not emitted — not languages
    // this catalog tracks (see scripts/data/pokemon-set-translations.ts's
    // scope: ja/ko/zh-cn/zh-tw only).
  }
  // Plain "(TCG)" pages with no `jasetname` are EN/International sets —
  // out of scope, already fully covered by the primary tcgdex import.

  return out.filter((e) => e.nameEn);
}

function pageUrl(title: string): string {
  return `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

// ---------------------------------------------------------------------------
// derive

async function derive() {
  const cache = openCrawlCache<PageRecord>(CACHE_NAME);
  const pages = cache.all();
  cache.close();
  if (pages.length === 0) throw new Error(`No cached pages — run "crawl" first.`);

  const imageUrls: Record<string, string> = fs.existsSync(IMAGE_URL_CACHE_FILE)
    ? JSON.parse(fs.readFileSync(IMAGE_URL_CACHE_FILE, "utf-8"))
    : {};

  const dbSets = await db.set.findMany({
    where: { gameId: "pokemon", id: { startsWith: "pokemon:" } },
    select: { id: true, code: true, name: true, nameEn: true, logoUrl: true, cardCount: true },
  });

  type DbSet = (typeof dbSets)[number];
  const byLangByNormalizedName = new Map<TargetLang, Map<string, DbSet[]>>();
  const byLangByNativeName = new Map<TargetLang, Map<string, DbSet[]>>();
  for (const lang of TARGET_LANGS) {
    byLangByNormalizedName.set(lang, new Map());
    byLangByNativeName.set(lang, new Map());
  }
  for (const set of dbSets) {
    const lang = TARGET_LANGS.find((l) => set.code.startsWith(`${l}:`));
    if (!lang) continue;
    if (set.nameEn) {
      const key = normalizeName(set.nameEn);
      const bucket = byLangByNormalizedName.get(lang)!;
      bucket.set(key, [...(bucket.get(key) ?? []), set]);
    }
    // set.name is always the source provider's native-script name for a
    // non-English Set row (nameEn is the separate English gloss) — no
    // filtering needed, every row has one.
    const nativeBucket = byLangByNativeName.get(lang)!;
    nativeBucket.set(set.name, [...(nativeBucket.get(set.name) ?? []), set]);
  }

  const entriesByLang = new Map<TargetLang, SetLogoEntry[]>(TARGET_LANGS.map((l) => [l, []]));
  const reviewByLang = new Map<TargetLang, SetLogoReviewEntry[]>(TARGET_LANGS.map((l) => [l, []]));
  const counts = {
    alreadySet: 0,
    noLogo: 0,
    noMatch: 0,
    ambiguous: 0,
    countMismatch: 0,
    matched: 0,
    matchedByNativeName: 0,
    matchedBySplit: 0,
  };

  /** SET A / SET B lookup: e.g. "Sword & Shield" -> DB rows named
   *  "Sword & Shield SET A" / "Sword & Shield SET B". Bulbapedia's ATCG
   *  articles describe both halves as one combined product (one page, one
   *  logo, one combined card count) while this catalog seeds them as two
   *  separate Set rows — so a plain name-equality match against the
   *  combined title never lines up. Tried generically (not just for pages
   *  with an explicit "N in Set A" count breakdown) since the DB's own
   *  "<name> SET A"/"SET B" naming is a strong, distinctive signal on its
   *  own; only fires when BOTH halves resolve to exactly one row each. */
  function findSetABSplit(lang: TargetLang, nameEn: string): [DbSet, DbSet] | null {
    const bucket = byLangByNormalizedName.get(lang)!;
    const a = bucket.get(normalizeName(`${nameEn} SET A`));
    const b = bucket.get(normalizeName(`${nameEn} SET B`));
    if (a?.length === 1 && b?.length === 1) return [a[0], b[0]];
    return null;
  }

  function emitMatch(parsed: ParsedLocaleEntry, page: PageRecord, logoUrl: string, dbSet: DbSet, matchedByNativeName: boolean) {
    if (dbSet.logoUrl) {
      counts.alreadySet += 1;
      return;
    }
    counts.matched += 1;
    if (matchedByNativeName) counts.matchedByNativeName += 1;
    entriesByLang.get(parsed.lang)!.push({
      setId: dbSet.id,
      logoUrl,
      nameEn: parsed.nameEn,
      sourceUrl: pageUrl(page.title),
      sourceName: page.title,
    });
  }

  for (const page of pages) {
    if (!page.wikitext) continue;
    for (const parsed of parsePageLocales(page.title, page.wikitext)) {
      const url = pageUrl(page.title);
      if (!parsed.logoFile) {
        counts.noLogo += 1;
        reviewByLang.get(parsed.lang)!.push({
          sourceCode: page.title,
          sourceUrl: url,
          sourceName: `${parsed.nameEn} (no logo image on this Bulbapedia page)`,
          logoUrl: "",
        });
        continue;
      }
      const logoUrl = imageUrls[parsed.logoFile];
      if (!logoUrl) {
        counts.noLogo += 1;
        reviewByLang.get(parsed.lang)!.push({
          sourceCode: page.title,
          sourceUrl: url,
          sourceName: `${parsed.nameEn} (logo file "${parsed.logoFile}" did not resolve to a URL)`,
          logoUrl: "",
        });
        continue;
      }

      // 1. Native-script name — exact equality, no translation-wording
      // ambiguity, so no card-count corroboration needed. Takes priority
      // over the nameEn strategies below.
      const nativeMatches = parsed.nativeName ? byLangByNativeName.get(parsed.lang)!.get(parsed.nativeName) ?? [] : [];
      if (nativeMatches.length === 1) {
        emitMatch(parsed, page, logoUrl, nativeMatches[0], true);
        continue;
      }

      // 2. Combined-article SET A/SET B split.
      const split = findSetABSplit(parsed.lang, parsed.nameEn);
      if (split) {
        counts.matchedBySplit += 1;
        for (const dbSet of split) emitMatch(parsed, page, logoUrl, dbSet, false);
        continue;
      }

      // 3. Plain normalized-nameEn equality, corroborated by card count —
      // the fallback for everything else (see this script's header comment
      // for why nameEn alone is a weaker signal: two independent English
      // translations of the same native title often word it differently).
      const bucket = byLangByNormalizedName.get(parsed.lang)!;
      const matches = bucket.get(normalizeName(parsed.nameEn)) ?? [];

      if (matches.length === 0 && nativeMatches.length === 0) {
        counts.noMatch += 1;
        reviewByLang.get(parsed.lang)!.push({
          sourceCode: page.title,
          sourceUrl: url,
          sourceName: `${parsed.nameEn} (no Set.nameEn/native-name match — possibly not seeded yet, e.g. an announced/unreleased set)`,
          logoUrl,
        });
        continue;
      }
      if (matches.length > 1 || nativeMatches.length > 1) {
        counts.ambiguous += 1;
        reviewByLang.get(parsed.lang)!.push({
          sourceCode: page.title,
          sourceUrl: url,
          sourceName: `${parsed.nameEn} (ambiguous: ${Math.max(matches.length, nativeMatches.length)} Set rows share this name)`,
          logoUrl,
        });
        continue;
      }

      const dbSet = matches[0];
      if (
        parsed.cardCount != null &&
        dbSet.cardCount != null &&
        Math.abs(parsed.cardCount - dbSet.cardCount) > 2
      ) {
        counts.countMismatch += 1;
        reviewByLang.get(parsed.lang)!.push({
          sourceCode: page.title,
          sourceUrl: url,
          sourceName: `${parsed.nameEn} (card-count mismatch: Bulbapedia ${parsed.cardCount} vs DB ${dbSet.cardCount} for matched set ${dbSet.id})`,
          logoUrl,
        });
        continue;
      }

      emitMatch(parsed, page, logoUrl, dbSet, false);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const lang of TARGET_LANGS) {
    const outFile: SetLogoFile = {
      gameId: "pokemon",
      sourceNote: `Crawled from Bulbapedia (${CATEGORY}) on ${new Date().toISOString()} by crawl-pokemon-set-logos-bulbapedia.ts. Matched to Set rows by, in order: exact native-script name equality; a combined-article "SET A"/"SET B" name split; normalized Set.nameEn equality corroborated by card count.`,
      verified: false,
      generatedAt: new Date().toISOString(),
      entries: entriesByLang.get(lang)!,
    };
    fs.writeFileSync(path.join(OUT_DIR, `bulbapedia-${lang}.json`), JSON.stringify(outFile, null, 2));

    const reviewFile: SetLogoReviewFile = {
      gameId: "pokemon",
      note: `Bulbapedia (${lang}) set pages that did NOT produce a confident match. Never seeded.`,
      generatedAt: new Date().toISOString(),
      entries: reviewByLang.get(lang)!,
    };
    fs.writeFileSync(path.join(OUT_DIR, `bulbapedia-${lang}.review.json`), JSON.stringify(reviewFile, null, 2));
  }

  console.log(`\nMatched (logoUrl currently null): ${counts.matched}`);
  console.log(`  ...of which by native-script name: ${counts.matchedByNativeName}`);
  console.log(`  ...of which by SET A/SET B split (2 rows per page): ${counts.matchedBySplit}`);
  console.log(`Already had a logoUrl (left alone): ${counts.alreadySet}`);
  console.log(`No logo image on page / unresolved file: ${counts.noLogo}`);
  console.log(`No name match (see review): ${counts.noMatch}`);
  console.log(`Ambiguous name match (see review): ${counts.ambiguous}`);
  console.log(`Card-count mismatch (see review): ${counts.countMismatch}`);
  for (const lang of TARGET_LANGS) {
    console.log(`  bulbapedia-${lang}.json: ${entriesByLang.get(lang)!.length} entries, ${reviewByLang.get(lang)!.length} in review`);
  }
  console.log(
    `\nverified:false — spot-check entries against the linked Bulbapedia pages before flipping it, then wire the files into\n  scripts/backfill-set-logo-url.ts (CRAWLED_LOGO_FILES)\n  scripts/backfill-set-name-en.ts (CRAWLED_NAME_FILES)`
  );
}

// ---------------------------------------------------------------------------

async function main() {
  const cmd = process.argv[2];
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg?.slice("--only=".length);

  if (cmd === "index") await index();
  else if (cmd === "crawl") await crawl(only);
  else if (cmd === "derive") await derive();
  else {
    console.error("Usage: crawl-pokemon-set-logos-bulbapedia.ts <index|crawl|derive> [--only=<title substring>]");
    process.exit(1);
  }
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
