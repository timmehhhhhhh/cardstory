/**
 * Backfills images for Traditional Chinese (zh-tw) Pokémon cards from the
 * official Pokémon Asia card database.
 *
 * Why this exists: tcgdex — our provider for every non-English Pokémon card —
 * genuinely has no asset for ~5.3k zh-tw cards (its API returns image: null
 * and its CDN 404s), so they render as placeholders. asia.pokemon-card.com is
 * the publisher's own database and does have them.
 *
 * Two things make this cheap compared to the JP equivalent:
 *   - the card list can be filtered by set (?expansionCodes=S12a), and the
 *     official codes happen to match the tcgdex set codes we already store,
 *     so we enumerate only sets that actually have gaps; and
 *   - the image URL is *derivable* from the card's internal id
 *     (/tw/card-img/tw00019551.png), so it never has to be scraped — we only
 *     read the page to learn which id is which collector number.
 *
 * Only the URL is stored; images are hotlinked from the publisher's CDN and
 * never re-hosted. Run from a dev machine, never from a request or a cron.
 *
 * The guard chain and file writing live in scripts/lib/source-pipeline.ts.
 *
 *   npx tsx scripts/crawl-pokemon-tw-images.ts crawl [--sets=S12a,SV4a]
 *   npx tsx scripts/crawl-pokemon-tw-images.ts derive
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
const LANG = "zh-tw";
const CACHE_NAME = "pokemon-tw-crawl";
const OUT_DIR = path.join(process.cwd(), "scripts", "data", "card-images");

interface TwRecord extends CrawlRecord {
  /** Set code the page itself reports, e.g. "S12a" — authoritative over the query. */
  setCode: string | null;
  /** Collector number as printed, e.g. "001/076". */
  collector: string | null;
  name: string | null;
}

const politeGet = createPoliteFetcher();

function imageUrlForId(id: number): string {
  return `${ORIGIN}/tw/card-img/tw${String(id).padStart(8, "0")}.png`;
}

function detailUrlForId(id: number): string {
  return `${ORIGIN}/tw/card-search/detail/${id}/`;
}

async function enumerateSet(code: string): Promise<number[]> {
  const ids: number[] = [];
  for (let page = 1; ; page++) {
    const res = await politeGet(
      `${ORIGIN}/tw/card-search/list/?expansionCodes=${encodeURIComponent(code)}&pageNo=${page}`
    );
    if (res.status !== 200) break;
    const found = [...res.body.matchAll(/href="\/tw\/card-search\/detail\/(\d+)\/"/g)].map((m) =>
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

function parseDetail(htmlBody: string): { setCode: string | null; collector: string | null; name: string | null } {
  const $ = cheerio.load(htmlBody);

  // The "收錄商品" (contained in) link carries the official expansion code,
  // which is authoritative — we enumerate by set, but a card can be reached
  // from more than one query, so trust the page over the request.
  const href = $('a[href*="expansionCodes="]').first().attr("href") ?? "";
  const setCode = /expansionCodes=([^&"]+)/.exec(href)?.[1] ?? null;

  const collector = $(".collectorNumber").first().text().trim() || null;

  // <h1 class="pageHeader cardDetail"><span class="evolveMarker">基礎</span> 赫拉克羅斯 </h1>
  const h1 = $("h1.pageHeader").first();
  h1.find("span").remove();
  const name = h1.text().trim() || null;

  return { setCode, collector, name };
}

/** "001/076" -> "001". The catalog stores the left half only. */
function rawNumber(rec: TwRecord): string {
  return (rec.collector ?? "").split("/")[0]?.trim() ?? "";
}

const source: CardImageSource<TwRecord> = {
  name: "pokemon-tw",
  cacheName: CACHE_NAME,
  lang: LANG,
  outDir: OUT_DIR,
  sourceNote:
    "Traditional Chinese card images from the official Pokémon Asia card database " +
    "(asia.pokemon-card.com), crawled offline by scripts/crawl-pokemon-tw-images.ts. " +
    "Image URLs are derived from each card's internal id and hotlinked, never re-hosted. " +
    "Every entry passed a set-code, catalog-row and card-name match against our catalog.",
  reviewNote: "Crawled zh-tw cards that did NOT pass the mapping guards. Never seeded.",
  isParseable: (r) => Boolean(r.setCode && r.collector),
  sourceUrl: (r) => detailUrlForId(r.id),
  provenance: (r) => ({
    sourceName: r.name ?? "",
    sourceSetLabel: r.setCode ?? "",
    sourceNumber: r.collector ?? "",
  }),
  sourceSetCode: (r) => r.setCode,
  // Numbers are stored zero-padded to 3 (zh-tw:S10a-001), with a rare
  // unpadded promo — try both rather than guessing.
  candidates: (r) => [
    `${LANG}:${r.setCode}-${rawNumber(r).padStart(3, "0")}`,
    `${LANG}:${r.setCode}-${rawNumber(r)}`,
  ],
  // The name on the page must be the name in our catalog. This is the check
  // that independently catches a wrong set code, a bad number, or the page
  // structure drifting — never loosen it to raise the fill rate.
  nameGuard: (r, row) =>
    r.name && normalizeNameCjk(r.name) === normalizeNameCjk(row.name)
      ? { ok: true }
      : { ok: false, reason: "name-mismatch", catalogName: row.name },
  imageUrls: (r) => ({ small: imageUrlForId(r.id), large: imageUrlForId(r.id) }),
};

async function crawl(only?: string[]) {
  const codes = only?.length ? only : await setCodesWithMissingCardImages(LANG);
  console.log(`Sets to enumerate: ${codes.length}`);

  await withResumableCache<TwRecord>(CACHE_NAME, async (cache) => {
    for (const [i, code] of codes.entries()) {
      const ids = await enumerateSet(code);
      const todo = ids.filter((id) => !cache.seen.has(id));
      console.log(`[${i + 1}/${codes.length}] ${code}: ${ids.length} cards, ${todo.length} to fetch`);

      for (const id of todo) {
        const res = await politeGet(detailUrlForId(id));
        if (res.status !== 200) {
          cache.append({ id, status: res.status, setCode: null, collector: null, name: null });
          continue;
        }
        cache.append({ id, status: 200, ...parseDetail(res.body) });
      }
    }
  });
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
  else usage("Usage: crawl-pokemon-tw-images.ts <crawl|derive> [--sets=S12a,SV4a]");
}

void runScript(main, () => db.$disconnect());
