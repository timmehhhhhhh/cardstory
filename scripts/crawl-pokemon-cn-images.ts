/**
 * Backfills images for Simplified Chinese (zh-cn) Pokémon cards from the
 * Hong Kong edition of the official Pokémon Asia card database.
 *
 * Why this exists: tcgdex — our provider for every non-English Pokémon card —
 * has no asset for our zh-cn cards, so they render as placeholders.
 * asia.pokemon-card.com/hk/ is the publisher's own database and does have
 * them, structured identically to the /tw/ site this repo already backfills
 * from (see crawl-pokemon-tw-images.ts).
 *
 * The catch: the HK site itself serves Traditional Chinese card text and
 * uses Hong Kong's own set-code convention, which is NOT the same as the
 * C-prefixed set-code convention tcgdex uses for most zh-cn sets (e.g.
 * "CSMPiC", "CSV1C"). For the handful of zh-cn sets that are actually
 * missing images, the codes happen to look like HK's own SV-style codes
 * (e.g. "SV7", "SV8a") — but a matching code string is not proof it's the
 * same physical set, so this crawler never trusts the code alone. Before
 * enumerating any set's cards, it fetches one sample card from that set and
 * compares the set name printed on the HK page (from the "收錄商品" /
 * "擴充包「…」" link) against our catalog's Set.name. A set that doesn't
 * verify is skipped and reported — never guessed. Cards that DO verify are
 * hotlinked as-is; the art is correct, but the card text on the image itself
 * is Traditional Chinese, not Simplified — a deliberate tradeoff, not a bug.
 *
 * Only the URL is stored; images are hotlinked from the publisher's CDN and
 * never re-hosted. Run from a dev machine, never from a request or a cron.
 *
 * The guard chain and file writing live in scripts/lib/source-pipeline.ts.
 *
 *   npx tsx scripts/crawl-pokemon-cn-images.ts crawl [--sets=SV7,SV8a]
 *   npx tsx scripts/crawl-pokemon-cn-images.ts derive
 */
import * as path from "node:path";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { bareSetCode, setCodesWithMissingCardImages } from "@/lib/content-gaps";
import { createPoliteFetcher } from "./lib/polite-fetch";
import { type CrawlRecord } from "./lib/crawl-cache";
import { normalizeNameCjk } from "./lib/normalize";
import { argList, runScript, usage, verb } from "./lib/cli";
import {
  deriveFromCache,
  withResumableCache,
  writeDeriveOutput,
  type CardImageSource,
  type CatalogRow,
} from "./lib/source-pipeline";

const ORIGIN = "https://asia.pokemon-card.com";
const LANG = "zh-cn";
const CACHE_NAME = "pokemon-cn-crawl";
const OUT_DIR = path.join(process.cwd(), "scripts", "data", "card-images");

interface CnRecord extends CrawlRecord {
  /** Set code the page itself reports, e.g. "SV7" — authoritative over the query. */
  setCode: string | null;
  /** Collector number as printed, e.g. "001/102". */
  collector: string | null;
  name: string | null;
  /** Set name printed on the page's "擴充包「…」" link, used to verify set identity. */
  setNameOnPage: string | null;
}

const politeGet = createPoliteFetcher();

function imageUrlForId(id: number): string {
  return `${ORIGIN}/hk/card-img/hk${String(id).padStart(8, "0")}.png`;
}

function detailUrlForId(id: number): string {
  return `${ORIGIN}/hk/card-search/detail/${id}/`;
}

function listUrl(code: string, page: number): string {
  return `${ORIGIN}/hk/card-search/list/?expansionCodes=${encodeURIComponent(code)}&pageNo=${page}`;
}

async function enumerateSet(code: string): Promise<number[]> {
  const ids: number[] = [];
  for (let page = 1; ; page++) {
    const res = await politeGet(listUrl(code, page));
    if (res.status !== 200) break;
    const found = [...res.body.matchAll(/href="\/hk\/card-search\/detail\/(\d+)\/"/g)].map((m) =>
      Number(m[1])
    );
    if (found.length === 0) break;
    ids.push(...found);

    // "共 N 頁" — total page count, so we stop without a wasted probe request.
    const total = Number(/共\s*(\d+)\s*頁/.exec(res.body)?.[1] ?? 0);
    if (total > 0 && page >= total) break;
    if (page > 200) break; // paranoia against a pagination loop
  }
  return [...new Set(ids)];
}

function parseDetail(htmlBody: string): {
  setCode: string | null;
  collector: string | null;
  name: string | null;
  setNameOnPage: string | null;
} {
  const $ = cheerio.load(htmlBody);

  // The "收錄商品" (contained in) link carries the official expansion code AND
  // its display name — the code is authoritative for enumeration, but the
  // name is what lets us verify this HK set is actually our zh-cn set before
  // trusting the code match at all.
  const link = $('a[href*="expansionCodes="]').first();
  const href = link.attr("href") ?? "";
  const setCode = /expansionCodes=([^&"]+)/.exec(href)?.[1] ?? null;

  // e.g. "擴充包「星晶奇跡」" or "戰術牌組「超級噴火龍Xex」" — strip the
  // wrapper, keep the bracketed name.
  const linkText = link.text().trim();
  const setNameOnPage = /[「『](.+)[」』]/.exec(linkText)?.[1]?.trim() ?? null;

  const collector = $(".collectorNumber").first().text().trim() || null;

  // <h1 class="pageHeader cardDetail"><span class="evolveMarker">基礎</span> 芭瓢蟲 </h1>
  const h1 = $("h1.pageHeader").first();
  h1.find("span").remove();
  const name = h1.text().trim() || null;

  return { setCode, collector, name, setNameOnPage };
}

/** "001/102" -> "001". The catalog stores the left half only. */
function rawNumber(rec: CnRecord): string {
  return (rec.collector ?? "").split("/")[0]?.trim() ?? "";
}

const source: CardImageSource<CnRecord> = {
  name: "pokemon-cn",
  cacheName: CACHE_NAME,
  lang: LANG,
  outDir: OUT_DIR,
  sourceNote:
    "Simplified Chinese (zh-cn) card images sourced from the Hong Kong edition of the " +
    "official Pokémon Asia card database (asia.pokemon-card.com/hk/), crawled offline by " +
    "scripts/crawl-pokemon-cn-images.ts. Caveat: the HK site itself displays Traditional " +
    "Chinese card text, so the art is correct but the text rendered on the image is " +
    "Traditional, not Simplified. Every entry belongs to a set whose HK-printed set name " +
    "was independently verified against our catalog Set.name before any of its cards were " +
    "crawled (never assumed from a matching set-code string alone), and every card entry " +
    "also passed a catalog-row and card-name match. Image URLs are derived from each card's " +
    "internal id and hotlinked, never re-hosted.",
  reviewNote: "Crawled zh-cn cards that did NOT pass the mapping guards. Never seeded.",
  isParseable: (r) => Boolean(r.setCode && r.collector),
  sourceUrl: (r) => detailUrlForId(r.id),
  provenance: (r) => ({
    sourceName: r.name ?? "",
    sourceSetLabel: r.setCode ?? "",
    sourceNumber: r.collector ?? "",
  }),
  sourceSetCode: (r) => r.setCode,
  candidates: (r) => [
    `${LANG}:${r.setCode}-${rawNumber(r).padStart(3, "0")}`,
    `${LANG}:${r.setCode}-${rawNumber(r)}`,
  ],
  nameGuard: (r, row) =>
    r.name && normalizeNameCjk(r.name) === normalizeNameCjk(row.name)
      ? { ok: true }
      : { ok: false, reason: "name-mismatch", catalogName: row.name },
  imageUrls: (r) => ({ small: imageUrlForId(r.id), large: imageUrlForId(r.id) }),
};

/**
 * Confirms an HK set code really is the zh-cn set we think it is, by reading
 * the set name off one sample card and comparing it to our catalog
 * Set.name. Callers must not enumerate/crawl the set unless this returns ok.
 */
async function verifySetIdentity(
  code: string,
  catalogSetName: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const res = await politeGet(listUrl(code, 1));
  if (res.status !== 200) return { ok: false, reason: `list page returned ${res.status}` };

  const sampleId = [...res.body.matchAll(/href="\/hk\/card-search\/detail\/(\d+)\/"/g)][0]?.[1];
  if (!sampleId) return { ok: false, reason: "no cards found for this code on HK" };

  const detailRes = await politeGet(detailUrlForId(Number(sampleId)));
  if (detailRes.status !== 200) return { ok: false, reason: `detail page returned ${detailRes.status}` };

  const { setNameOnPage } = parseDetail(detailRes.body);
  if (!setNameOnPage) return { ok: false, reason: "couldn't read a set name off the sample card" };

  if (normalizeNameCjk(setNameOnPage) !== normalizeNameCjk(catalogSetName)) {
    return {
      ok: false,
      reason: `HK set name "${setNameOnPage}" does not match catalog Set.name "${catalogSetName}"`,
    };
  }
  return { ok: true };
}

async function crawl(only?: string[]) {
  const setRows = await db.set.findMany({
    where: { id: { startsWith: `pokemon:${LANG}:` }, items: { some: { imageSmallUrl: null } } },
    select: { code: true, name: true },
  });
  const catalogNameByCode = new Map(setRows.map((r) => [bareSetCode(r.code), r.name]));

  const codes = only?.length ? only : await setCodesWithMissingCardImages(LANG);
  console.log(`Sets to consider: ${codes.length}`);

  const verified: string[] = [];
  const skipped: { code: string; reason: string }[] = [];

  await withResumableCache<CnRecord>(CACHE_NAME, async (cache) => {
    for (const [i, code] of codes.entries()) {
      const catalogName = catalogNameByCode.get(code);
      if (!catalogName) {
        skipped.push({ code, reason: "no matching zh-cn Set row for this code" });
        continue;
      }

      const verdict = await verifySetIdentity(code, catalogName);
      if (!verdict.ok) {
        console.log(`[${i + 1}/${codes.length}] ${code}: SKIPPED — ${verdict.reason}`);
        skipped.push({ code, reason: verdict.reason });
        continue;
      }
      verified.push(code);

      const ids = await enumerateSet(code);
      const todo = ids.filter((id) => !cache.seen.has(id));
      console.log(
        `[${i + 1}/${codes.length}] ${code}: verified ("${catalogName}"), ${ids.length} cards, ${todo.length} to fetch`
      );

      for (const id of todo) {
        const res = await politeGet(detailUrlForId(id));
        if (res.status !== 200) {
          cache.append({ id, status: res.status, setCode: null, collector: null, name: null, setNameOnPage: null });
          continue;
        }
        cache.append({ id, status: 200, ...parseDetail(res.body) });
      }
    }
  });

  console.log(`\nVerified sets crawled: ${verified.length} (${verified.join(", ") || "none"})`);
  console.log(`Skipped sets: ${skipped.length}`);
  for (const s of skipped) console.log(`  - ${s.code}: ${s.reason}`);
}

async function derive() {
  const catalog = await db.catalogItem.findMany({
    where: { gameId: "pokemon", externalId: { startsWith: `${LANG}:` } },
    select: { externalId: true, name: true, imageSmallUrl: true },
  });
  const byExternalId = new Map<string, CatalogRow>(catalog.map((c) => [c.externalId, c]));

  const sets = await db.set.findMany({
    where: { id: { startsWith: `pokemon:${LANG}:` } },
    select: { code: true },
  });
  const knownSetCodes = new Set(sets.map((s) => bareSetCode(s.code)));

  writeDeriveOutput(source, deriveFromCache({ source, byExternalId, knownSetCodes }));
}

async function main() {
  const cmd = verb();
  if (cmd === "crawl") await crawl(argList("sets"));
  else if (cmd === "derive") await derive();
  else usage("Usage: crawl-pokemon-cn-images.ts <crawl|derive> [--sets=SV7,SV8a]");
}

void runScript(main, () => db.$disconnect());
