/**
 * Recurring Pokémon card-image backfill — extracted from
 * scripts/crawl-pokemon-{ja,cn,tw,jp-pokellector}-images.ts, parameterized
 * by source. The only real change from the originals: resumability moves
 * from scripts/lib/crawl-cache.ts (fs, gitignored scripts/.cache/*.jsonl)
 * to a CronJobState cursor row per source (there is no writable filesystem
 * under Cloudflare Workers), and results are written to
 * CrawledImageCandidate (status: "pending") instead of a derived
 * scripts/data/card-images/*.json mapping file for a human to flip
 * `verified: true` on. Every match still passes the exact same name-guard/
 * catalog-row checks the originals use — see each source's comment below.
 *
 * `runPokemonImageBackfillChunk` is the entry point the cron route calls: it
 * rotates through the four sources one per invocation (each source's own
 * bounded chunk already runs ~60-90s at polite-fetch.ts's pacing, so doing
 * more than one source per request risks the Worker's time budget), tracked
 * by a top-level "pokemon-image-backfill" CronJobState row; each source also
 * keeps its own "pokemon-image-backfill:<source>" row for its crawl cursor.
 */
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { createPoliteFetcher, CrawlAbortedError } from "../../../../scripts/lib/polite-fetch";
import { getCronCursor, recordCronSuccess, recordCronCircuitBroken, recordCronError } from "@/lib/automation/cron-job-state";
import { upsertImageCandidate } from "@/lib/automation/candidate-store";

export const IMAGE_BACKFILL_JOB_NAME = "pokemon-image-backfill";
const SOURCES = ["ja", "cn", "tw", "jp-pokellector"] as const;
type Source = (typeof SOURCES)[number];

interface RotationCursor {
  sourceIndex: number;
}

export interface ImageBackfillSummary {
  source: Source;
  fetched: number;
  matched: number;
  circuitBroken: boolean;
}

/** NFKC + strip whitespace/punctuation, so formatting variants don't fail the name guard — identical to every crawl-pokemon-*-images.ts script. */
function normalizeName(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\s　]/g, "")
    .replace(/[·・.,'’"“”\-—–~〜!?！？:：;；()（）「」『』【】[\]]/g, "")
    .toLowerCase();
}

async function lookupCatalog(lang: string) {
  const catalog = await db.catalogItem.findMany({
    where: { gameId: "pokemon", externalId: { startsWith: `${lang}:` } },
    select: { externalId: true, name: true, imageSmallUrl: true },
  });
  return new Map(catalog.map((c) => [c.externalId, c]));
}

// ---------------------------------------------------------------------------
// ja: pokemon-card.com — a full sweep of the internal id space (~1..52,000).
// See scripts/crawl-pokemon-ja-images.ts.
// ---------------------------------------------------------------------------

const JA_ORIGIN = "https://www.pokemon-card.com";
const JA_MAX_ID = 52_000;

function jaDetailUrl(id: number): string {
  return `${JA_ORIGIN}/card-search/details.php/card/${id}/regu/all`;
}

function parseJaDetail(html: string) {
  const $ = cheerio.load(html);
  const imgPath = $("img.fit").first().attr("src") ?? null;
  const name = $("h1.Heading1").first().text().trim() || null;
  const subtext = $(".subtext").first();
  const setCode = subtext.find("img.img-regulation").first().attr("alt")?.trim() || null;
  const numberText = subtext.text().replace(/ /g, " ").trim();
  const number = /(\d+)\s*\/\s*\d+/.exec(numberText)?.[1] ?? null;
  return { setCode, number, name, imgPath };
}

async function crawlJaChunk(cursor: { nextId: number } | null, chunkSize: number, politeGet: ReturnType<typeof createPoliteFetcher>) {
  const startId = cursor?.nextId ?? 1;
  const byExternalId = await lookupCatalog("ja");
  let fetched = 0;
  let matched = 0;
  let id = startId;
  let wrapped = false;

  for (; fetched < chunkSize; fetched++, id++) {
    if (id > JA_MAX_ID) {
      id = 1;
      wrapped = true;
    }
    const res = await politeGet(jaDetailUrl(id));
    if (res.status !== 200) continue;

    const parsed = parseJaDetail(res.body);
    if (!parsed.setCode || !parsed.number || !parsed.imgPath || !parsed.name) continue;

    const candidates = [
      `ja:${parsed.setCode}-${parsed.number.padStart(3, "0")}`,
      `ja:${parsed.setCode}-${parsed.number}`,
    ];
    const externalId = candidates.find((c) => byExternalId.has(c));
    if (!externalId) continue;
    const row = byExternalId.get(externalId)!;
    if (row.imageSmallUrl) continue; // provider already has art
    if (normalizeName(parsed.name) !== normalizeName(row.name)) continue; // name guard — see header comment

    const url = `${JA_ORIGIN}${parsed.imgPath}`;
    await upsertImageCandidate({
      source: "pokemon-card.com-ja",
      targetType: "catalogItem",
      catalogItemGameId: "pokemon",
      catalogItemExternalId: externalId,
      imageUrl: url,
      sourceUrl: jaDetailUrl(id),
    });
    matched++;
  }

  return { nextCursor: { nextId: id }, fetched, matched, wrapped };
}

// ---------------------------------------------------------------------------
// tw: asia.pokemon-card.com — enumerate only sets with gaps, image URL is
// derivable from the card id. See scripts/crawl-pokemon-tw-images.ts.
// ---------------------------------------------------------------------------

const ASIA_ORIGIN = "https://asia.pokemon-card.com";

function twImageUrl(id: number): string {
  return `${ASIA_ORIGIN}/tw/card-img/tw${String(id).padStart(8, "0")}.png`;
}
function twDetailUrl(id: number): string {
  return `${ASIA_ORIGIN}/tw/card-search/detail/${id}/`;
}
function parseAsiaDetail(html: string) {
  const $ = cheerio.load(html);
  const href = $('a[href*="expansionCodes="]').first().attr("href") ?? "";
  const setCode = /expansionCodes=([^&"]+)/.exec(href)?.[1] ?? null;
  const collector = $(".collectorNumber").first().text().trim() || null;
  const h1 = $("h1.pageHeader").first();
  h1.find("span").remove();
  const name = h1.text().trim() || null;
  return { setCode, collector, name };
}
async function enumerateAsiaSet(
  origin: "tw" | "hk",
  code: string,
  politeGet: ReturnType<typeof createPoliteFetcher>
): Promise<number[]> {
  const ids: number[] = [];
  for (let page = 1; page <= 200; page++) {
    const res = await politeGet(
      `${ASIA_ORIGIN}/${origin}/card-search/list/?expansionCodes=${encodeURIComponent(code)}&pageNo=${page}`
    );
    if (res.status !== 200) break;
    const found = [...res.body.matchAll(new RegExp(`href="\\/${origin}\\/card-search\\/detail\\/(\\d+)\\/"`, "g"))].map(
      (m) => Number(m[1])
    );
    if (found.length === 0) break;
    ids.push(...found);
    const total = Number(/共\s*(\d+)\s*頁/.exec(res.body)?.[1] ?? 0);
    if (total > 0 && page >= total) break;
  }
  return [...new Set(ids)];
}

interface QueueCursor {
  queue: number[];
}

async function crawlTwChunk(cursor: QueueCursor | null, chunkSize: number, politeGet: ReturnType<typeof createPoliteFetcher>) {
  let queue = cursor?.queue ?? [];
  let wrapped = false;
  if (queue.length === 0) {
    const rows = await db.set.findMany({
      where: { id: { startsWith: "pokemon:zh-tw:" }, items: { some: { imageSmallUrl: null } } },
      select: { code: true },
    });
    const codes = rows.map((r) => r.code.replace(/^zh-tw:/, "")).filter(Boolean);
    for (const code of codes) queue.push(...(await enumerateAsiaSet("tw", code, politeGet)));
    wrapped = true; // a full refill sweep completed — treat as "start of a new pass"
  }

  const byExternalId = await lookupCatalog("zh-tw");
  const todo = queue.slice(0, chunkSize);
  let matched = 0;
  for (const id of todo) {
    const res = await politeGet(twDetailUrl(id));
    if (res.status !== 200) continue;
    const parsed = parseAsiaDetail(res.body);
    if (!parsed.setCode || !parsed.collector || !parsed.name) continue;

    const rawNumber = parsed.collector.split("/")[0]?.trim() ?? "";
    const candidates = [`zh-tw:${parsed.setCode}-${rawNumber.padStart(3, "0")}`, `zh-tw:${parsed.setCode}-${rawNumber}`];
    const externalId = candidates.find((c) => byExternalId.has(c));
    if (!externalId) continue;
    const row = byExternalId.get(externalId)!;
    if (row.imageSmallUrl) continue;
    if (normalizeName(parsed.name) !== normalizeName(row.name)) continue;

    await upsertImageCandidate({
      source: "asia.pokemon-card.com-tw",
      targetType: "catalogItem",
      catalogItemGameId: "pokemon",
      catalogItemExternalId: externalId,
      imageUrl: twImageUrl(id),
      sourceUrl: twDetailUrl(id),
    });
    matched++;
  }

  queue = queue.slice(todo.length);
  return { nextCursor: { queue }, fetched: todo.length, matched, wrapped };
}

// ---------------------------------------------------------------------------
// cn (zh-cn): same shape as tw, from the Hong Kong edition, gated on a
// per-set name-verification step. See scripts/crawl-pokemon-cn-images.ts.
// ---------------------------------------------------------------------------

function cnImageUrl(id: number): string {
  return `${ASIA_ORIGIN}/hk/card-img/hk${String(id).padStart(8, "0")}.png`;
}
function cnDetailUrl(id: number): string {
  return `${ASIA_ORIGIN}/hk/card-search/detail/${id}/`;
}
function cnListUrl(code: string, page: number): string {
  return `${ASIA_ORIGIN}/hk/card-search/list/?expansionCodes=${encodeURIComponent(code)}&pageNo=${page}`;
}
function parseCnDetail(html: string) {
  const $ = cheerio.load(html);
  const link = $('a[href*="expansionCodes="]').first();
  const href = link.attr("href") ?? "";
  const setCode = /expansionCodes=([^&"]+)/.exec(href)?.[1] ?? null;
  const linkText = link.text().trim();
  const setNameOnPage = /[「『](.+)[」』]/.exec(linkText)?.[1]?.trim() ?? null;
  const collector = $(".collectorNumber").first().text().trim() || null;
  const h1 = $("h1.pageHeader").first();
  h1.find("span").remove();
  const name = h1.text().trim() || null;
  return { setCode, collector, name, setNameOnPage };
}
async function verifyCnSetIdentity(
  code: string,
  catalogSetName: string,
  politeGet: ReturnType<typeof createPoliteFetcher>
): Promise<boolean> {
  const res = await politeGet(cnListUrl(code, 1));
  if (res.status !== 200) return false;
  const sampleId = [...res.body.matchAll(/href="\/hk\/card-search\/detail\/(\d+)\/"/g)][0]?.[1];
  if (!sampleId) return false;
  const detailRes = await politeGet(cnDetailUrl(Number(sampleId)));
  if (detailRes.status !== 200) return false;
  const { setNameOnPage } = parseCnDetail(detailRes.body);
  if (!setNameOnPage) return false;
  return normalizeName(setNameOnPage) === normalizeName(catalogSetName);
}

async function crawlCnChunk(cursor: QueueCursor | null, chunkSize: number, politeGet: ReturnType<typeof createPoliteFetcher>) {
  let queue = cursor?.queue ?? [];
  let wrapped = false;
  if (queue.length === 0) {
    const rows = await db.set.findMany({
      where: { id: { startsWith: "pokemon:zh-cn:" }, items: { some: { imageSmallUrl: null } } },
      select: { code: true, name: true },
    });
    for (const row of rows) {
      const code = row.code.replace(/^zh-cn:/, "");
      if (!code) continue;
      // Never trust a code match alone — verify the HK page's own printed
      // set name against our catalog first. See this module's header /
      // scripts/crawl-pokemon-cn-images.ts's header for why.
      if (!(await verifyCnSetIdentity(code, row.name, politeGet))) continue;
      queue.push(...(await enumerateAsiaSet("hk", code, politeGet)));
    }
    wrapped = true;
  }

  const byExternalId = await lookupCatalog("zh-cn");
  const todo = queue.slice(0, chunkSize);
  let matched = 0;
  for (const id of todo) {
    const res = await politeGet(cnDetailUrl(id));
    if (res.status !== 200) continue;
    const parsed = parseCnDetail(res.body);
    if (!parsed.setCode || !parsed.collector || !parsed.name) continue;

    const rawNumber = parsed.collector.split("/")[0]?.trim() ?? "";
    const candidates = [`zh-cn:${parsed.setCode}-${rawNumber.padStart(3, "0")}`, `zh-cn:${parsed.setCode}-${rawNumber}`];
    const externalId = candidates.find((c) => byExternalId.has(c));
    if (!externalId) continue;
    const row = byExternalId.get(externalId)!;
    if (row.imageSmallUrl) continue;
    if (normalizeName(parsed.name) !== normalizeName(row.name)) continue;

    await upsertImageCandidate({
      source: "asia.pokemon-card.com-hk-for-zh-cn",
      targetType: "catalogItem",
      catalogItemGameId: "pokemon",
      catalogItemExternalId: externalId,
      imageUrl: cnImageUrl(id),
      sourceUrl: cnDetailUrl(id),
    });
    matched++;
  }

  queue = queue.slice(todo.length);
  return { nextCursor: { queue }, fetched: todo.length, matched, wrapped };
}

// ---------------------------------------------------------------------------
// jp-pokellector: jp.pokellector.com, a fan card database, cheap to
// enumerate by set. See scripts/crawl-pokemon-jp-pokellector-images.ts.
// ---------------------------------------------------------------------------

const POKELLECTOR_ORIGIN = "https://jp.pokellector.com";

interface PokellectorQueueCursor {
  queue: { id: number; href: string }[];
}

/**
 * The original crawler resolves each set's exact pokellector code by
 * fetching every one of ~204 set pages once and reading its `<meta
 * keywords>` (see scripts/crawl-pokemon-jp-pokellector-images.ts's `index`
 * command), then caches that to disk for every later `crawl` run.
 * Cloudflare Workers has no disk, and re-fetching all ~204 pages every
 * chunked run just to rebuild that cache would dwarf this leg's own request
 * budget — so this matches sets by normalized name against the slug alone
 * instead (pokellector's slugs are title-cased set names, e.g.
 * "/VMAX-Climax-Expansion/"), one request total for the whole listing page.
 */
async function fetchPokellectorSlugs(politeGet: ReturnType<typeof createPoliteFetcher>): Promise<string[]> {
  const res = await politeGet(`${POKELLECTOR_ORIGIN}/sets`);
  if (res.status !== 200) return [];
  return [...new Set([...res.body.matchAll(/href="(\/[A-Za-z0-9-]+-Expansion\/)"/g)].map((m) => m[1]))];
}

function slugToNormalizedName(slug: string): string {
  return slug
    .replace(/^\/|\/$/g, "")
    .replace(/-Expansion$/, "")
    .replace(/-/g, " ")
    .toLowerCase();
}

function parsePokellectorDetail(html: string) {
  const $ = cheerio.load(html);
  const nameJa = $('strong:contains("JPN:")').first().parent().find("a").first().text().trim() || null;
  const cardText = $('strong:contains("Card:")').first().parent().find("a").first().text().trim() || "";
  const number = /^(\d+)\s*\/\s*\d+/.exec(cardText)?.[1] ?? null;
  const imageUrl = $('img[src*="den-cards.pokellector.com"]').first().attr("src") ?? null;
  return { number, nameJa, imageUrl };
}
async function crawlJpPokellectorChunk(
  cursor: PokellectorQueueCursor | null,
  chunkSize: number,
  politeGet: ReturnType<typeof createPoliteFetcher>
) {
  let queue = cursor?.queue ?? [];
  let wrapped = false;
  if (queue.length === 0) {
    const rows = await db.set.findMany({
      where: { id: { startsWith: "pokemon:ja:" }, items: { some: { imageSmallUrl: null } } },
      select: { code: true, name: true },
    });
    const slugs = await fetchPokellectorSlugs(politeGet);
    for (const row of rows) {
      // Match this DB set to a pokellector slug by normalized set name —
      // see fetchPokellectorSlugs's comment for why this replaces the
      // original's exact-code join.
      const wanted = normalizeName(row.name);
      const slug = slugs.find((s) => normalizeName(slugToNormalizedName(s)) === wanted);
      if (!slug) continue;
      const res = await politeGet(`${POKELLECTOR_ORIGIN}${slug}`);
      if (res.status !== 200) continue;
      const seen = new Set<number>();
      for (const m of res.body.matchAll(/<a href="(\/[^"]+)" name="card(\d+)"/g)) {
        const id = Number(m[2]);
        if (seen.has(id)) continue;
        seen.add(id);
        queue.push({ id, href: m[1] });
      }
    }
    wrapped = true;
  }

  const byExternalId = await lookupCatalog("ja");
  const todo = queue.slice(0, chunkSize);
  let matched = 0;
  for (const { href } of todo) {
    const res = await politeGet(`${POKELLECTOR_ORIGIN}${href}`);
    if (res.status !== 200) continue;
    const parsed = parsePokellectorDetail(res.body);
    if (!parsed.number || !parsed.nameJa || !parsed.imageUrl) continue;

    // No dbSetCode carried through here (see the comment above on why the
    // exact-code index isn't rebuilt) — so unlike the original script, the
    // set code half of the externalId can't be reconstructed independently.
    // Instead this looks up every non-EN-image ja: row whose number matches
    // and whose name passes the guard, across all ja sets currently missing
    // art — safe because the name guard below is exactly as strict as the
    // original's externalId-first lookup, just checked in the other order.
    let externalId: string | undefined;
    for (const [candidateId, row] of byExternalId) {
      if (row.imageSmallUrl) continue;
      const suffix = candidateId.split("-").pop();
      if (suffix !== parsed.number && suffix !== parsed.number.padStart(3, "0")) continue;
      if (normalizeName(parsed.nameJa) !== normalizeName(row.name)) continue;
      externalId = candidateId;
      break;
    }
    if (!externalId) continue;

    await upsertImageCandidate({
      source: "jp.pokellector.com",
      targetType: "catalogItem",
      catalogItemGameId: "pokemon",
      catalogItemExternalId: externalId,
      imageUrl: parsed.imageUrl,
      imageBackUrl: undefined,
      sourceUrl: `${POKELLECTOR_ORIGIN}${href}`,
    });
    matched++;
  }

  queue = queue.slice(todo.length);
  return { nextCursor: { queue }, fetched: todo.length, matched, wrapped };
}

// ---------------------------------------------------------------------------
// Rotation entry point
// ---------------------------------------------------------------------------

const SOURCE_CHUNK_SIZE = 60;

export async function runPokemonImageBackfillChunk(): Promise<ImageBackfillSummary> {
  const rotation = (await getCronCursor<RotationCursor>(IMAGE_BACKFILL_JOB_NAME)) ?? { sourceIndex: 0 };
  const source = SOURCES[rotation.sourceIndex % SOURCES.length];
  const sourceJobName = `${IMAGE_BACKFILL_JOB_NAME}:${source}`;
  const politeGet = createPoliteFetcher();

  try {
    const cursor = await getCronCursor<Record<string, unknown>>(sourceJobName);
    let result;
    if (source === "ja") result = await crawlJaChunk(cursor as { nextId: number } | null, SOURCE_CHUNK_SIZE, politeGet);
    else if (source === "tw") result = await crawlTwChunk(cursor as QueueCursor | null, SOURCE_CHUNK_SIZE, politeGet);
    else if (source === "cn") result = await crawlCnChunk(cursor as QueueCursor | null, SOURCE_CHUNK_SIZE, politeGet);
    else result = await crawlJpPokellectorChunk(cursor as PokellectorQueueCursor | null, SOURCE_CHUNK_SIZE, politeGet);

    await recordCronSuccess(sourceJobName, result.nextCursor, {
      fetched: result.fetched,
      matched: result.matched,
      wrapped: result.wrapped,
    });
    await recordCronSuccess(
      IMAGE_BACKFILL_JOB_NAME,
      { sourceIndex: (rotation.sourceIndex + 1) % SOURCES.length },
      { source, fetched: result.fetched, matched: result.matched }
    );
    return { source, fetched: result.fetched, matched: result.matched, circuitBroken: false };
  } catch (err) {
    if (err instanceof CrawlAbortedError) {
      await recordCronCircuitBroken(sourceJobName, err.message);
      // Still rotate to the next source next time — no reason to let one
      // uncooperative host starve the other three.
      await recordCronSuccess(IMAGE_BACKFILL_JOB_NAME, { sourceIndex: (rotation.sourceIndex + 1) % SOURCES.length }, {
        source,
        circuitBroken: true,
      });
      return { source, fetched: 0, matched: 0, circuitBroken: true };
    }
    await recordCronError(sourceJobName, (err as Error).message);
    await recordCronError(IMAGE_BACKFILL_JOB_NAME, (err as Error).message);
    throw err;
  }
}
