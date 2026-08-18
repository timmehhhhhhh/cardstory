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
 *   npx tsx scripts/crawl-pokemon-tw-images.ts crawl [--sets=S12a,SV4a]
 *   npx tsx scripts/crawl-pokemon-tw-images.ts derive
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as cheerio from "cheerio";
import { db } from "../src/lib/db";
import { createPoliteFetcher, CrawlAbortedError } from "./lib/polite-fetch";
import { openCrawlCache, type CrawlRecord } from "./lib/crawl-cache";
import type {
  CardImageEntry,
  CardImageFile,
  CardImageReviewEntry,
  CardImageReviewFile,
} from "./data/card-images/types";

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

/** Set codes that still have cards without an image. */
async function targetSetCodes(): Promise<string[]> {
  const rows = await db.set.findMany({
    where: { id: { startsWith: `pokemon:${LANG}:` }, items: { some: { imageSmallUrl: null } } },
    select: { code: true },
  });
  return rows.map((r) => r.code.replace(/^zh-tw:/, "")).filter(Boolean);
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

async function crawl(only?: string[]) {
  const cache = openCrawlCache<TwRecord>(CACHE_NAME);
  const codes = only?.length ? only : await targetSetCodes();
  console.log(`Sets to enumerate: ${codes.length}`);

  try {
    for (const [i, code] of codes.entries()) {
      const ids = await enumerateSet(code);
      const todo = ids.filter((id) => !cache.seen.has(id));
      console.log(
        `[${i + 1}/${codes.length}] ${code}: ${ids.length} cards, ${todo.length} to fetch`
      );

      for (const id of todo) {
        const res = await politeGet(detailUrlForId(id));
        if (res.status !== 200) {
          cache.append({ id, status: res.status, setCode: null, collector: null, name: null });
          continue;
        }
        const parsed = parseDetail(res.body);
        cache.append({ id, status: 200, ...parsed });
      }
    }
  } catch (err) {
    if (err instanceof CrawlAbortedError) {
      console.error(`\n${err.message}\nProgress is cached — rerun to resume.`);
    } else throw err;
  } finally {
    cache.close();
  }
  console.log(`Cached ${cache.seen.size} ids total.`);
}

/** NFKC + strip whitespace/punctuation, so formatting variants don't fail the name guard. */
function normalizeName(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\s　]/g, "")
    .replace(/[·・.,'’"“”\-—–~〜!?！？:：;；()（）「」『』【】[\]]/g, "")
    .toLowerCase();
}

async function derive() {
  const cache = openCrawlCache<TwRecord>(CACHE_NAME);
  const found = cache.all().filter((r) => r.status === 200);
  // See crawl-pokemon-ja-images.ts — unparseable pages go to review, not the bin.
  const records = found.filter((r) => r.setCode && r.collector);
  const unparseable = found.filter((r) => !(r.setCode && r.collector));
  cache.close();
  console.log(`Cards found: ${found.length} (${records.length} parseable, ${unparseable.length} not)`);

  const catalog = await db.catalogItem.findMany({
    where: { gameId: "pokemon", externalId: { startsWith: `${LANG}:` } },
    select: { externalId: true, name: true, imageSmallUrl: true },
  });
  const byExternalId = new Map(catalog.map((c) => [c.externalId, c]));

  let alreadyHadImage = 0;
  const entries: CardImageEntry[] = [];
  const review: CardImageReviewEntry[] = unparseable.map((r) => ({
    reason: "missing-page-fields" as const,
    sourceId: r.id,
    sourceUrl: detailUrlForId(r.id),
    sourceName: r.name ?? "",
    sourceSetLabel: r.setCode ?? "",
    sourceNumber: r.collector ?? "",
  }));

  for (const rec of records) {
    const sourceUrl = detailUrlForId(rec.id);
    const rawNumber = (rec.collector ?? "").split("/")[0]?.trim() ?? "";
    const base = {
      sourceId: rec.id,
      sourceUrl,
      sourceName: rec.name ?? "",
      sourceSetLabel: rec.setCode ?? "",
      sourceNumber: rec.collector ?? "",
    };

    // Numbers are stored zero-padded to 3 (zh-tw:S10a-001), with a rare
    // unpadded promo — try both rather than guessing.
    const candidates = [
      `${LANG}:${rec.setCode}-${rawNumber.padStart(3, "0")}`,
      `${LANG}:${rec.setCode}-${rawNumber}`,
    ];
    const externalId = candidates.find((c) => byExternalId.has(c));

    if (!externalId) {
      review.push({
        ...base,
        reason: byExternalId.size ? "no-catalog-row" : "unknown-set-code",
        candidateExternalId: candidates[0],
      });
      continue;
    }

    const row = byExternalId.get(externalId)!;

    // Guard: the name on the page must be the name in our catalog. This is the
    // check that independently catches a wrong set code, a bad number, or the
    // page structure drifting — never loosen it to raise the fill rate.
    if (!rec.name || normalizeName(rec.name) !== normalizeName(row.name)) {
      review.push({
        ...base,
        reason: "name-mismatch",
        candidateExternalId: externalId,
        catalogName: row.name,
      });
      continue;
    }

    if (row.imageSmallUrl) {
      alreadyHadImage += 1; // provider already supplied art; leave it alone
      continue;
    }

    const url = imageUrlForId(rec.id);
    entries.push({
      externalId,
      imageSmallUrl: url,
      imageLargeUrl: url,
      sourceUrl,
      sourceName: rec.name,
    });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out: CardImageFile = {
    gameId: "pokemon",
    sourceNote:
      "Traditional Chinese card images from the official Pokémon Asia card database " +
      "(asia.pokemon-card.com), crawled offline by scripts/crawl-pokemon-tw-images.ts. " +
      "Image URLs are derived from each card's internal id and hotlinked, never re-hosted. " +
      "Every entry passed a set-code, catalog-row and card-name match against our catalog.",
    verified: false,
    generatedAt: new Date().toISOString(),
    entries,
  };
  fs.writeFileSync(path.join(OUT_DIR, "pokemon-tw.json"), JSON.stringify(out, null, 2));

  const reviewOut: CardImageReviewFile = {
    gameId: "pokemon",
    note: "Crawled zh-tw cards that did NOT pass the mapping guards. Never seeded.",
    generatedAt: new Date().toISOString(),
    entries: review,
  };
  fs.writeFileSync(path.join(OUT_DIR, "pokemon-tw.review.json"), JSON.stringify(reviewOut, null, 2));

  const byReason = review.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nMapped:   ${entries.length}`);
  console.log(`Had art:  ${alreadyHadImage} (already sourced from the provider — untouched)`);
  console.log(`Review:   ${review.length}`, byReason);
  console.log(`\nWrote pokemon-tw.json (verified: false — review, then flip it).`);
}

async function main() {
  const cmd = process.argv[2];
  const setsArg = process.argv.find((a) => a.startsWith("--sets="));
  const only = setsArg?.slice("--sets=".length).split(",").filter(Boolean);

  if (cmd === "crawl") await crawl(only);
  else if (cmd === "derive") await derive();
  else {
    console.error("Usage: crawl-pokemon-tw-images.ts <crawl|derive> [--sets=S12a,SV4a]");
    process.exit(1);
  }
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
