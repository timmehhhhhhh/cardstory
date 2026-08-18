/**
 * Backfills images for Japanese Pokémon cards from the official
 * pokemon-card.com card database.
 *
 * Same motivation as the zh-tw crawler: tcgdex has no asset for ~8.7k JP cards
 * (API returns image: null, CDN 404s), so they render as placeholders.
 *
 * Unlike the zh-tw site, this one gives us no way to enumerate by set — its
 * search results load over an endpoint that refuses this client, and the
 * per-card pages are only reachable by internal id. So this is a full sweep of
 * the id space (~1..52,000), which is slow by design: ~0.55 req/s means the
 * whole run is on the order of a day. It is resumable — everything fetched is
 * cached, so run it in `--from/--to` chunks and interrupt freely.
 *
 * Cards older than roughly the Diamond & Pearl era are not in this id space at
 * all, so ~2k pre-2006 JP cards will not be filled by this and keep rendering
 * the CardImage placeholder.
 *
 * Only the URL is stored; images are hotlinked from the publisher's CDN and
 * never re-hosted. pokemon-card.com's footer asks that its images not be
 * reproduced without permission — hotlinking is a deliberate compromise, and
 * every row written here is identifiable by hostname so the whole set can be
 * dropped with one statement if that call is ever revisited.
 *
 *   npx tsx scripts/crawl-pokemon-ja-images.ts probe
 *   npx tsx scripts/crawl-pokemon-ja-images.ts sweep [--from=1] [--to=52000]
 *   npx tsx scripts/crawl-pokemon-ja-images.ts derive
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

const ORIGIN = "https://www.pokemon-card.com";
const LANG = "ja";
const CACHE_NAME = "pokemon-ja-crawl";
const OUT_DIR = path.join(process.cwd(), "scripts", "data", "card-images");
const DEFAULT_MAX_ID = 52_000;

/** Kept separate from JaRecord: CrawlRecord's index signature makes Omit<> on
 *  the combined type collapse to `unknown`, which loses these field types. */
interface JaCardFields {
  setCode: string | null;
  /** Collector number as printed, e.g. "038". */
  number: string | null;
  name: string | null;
  /** Path under the origin, e.g. "/assets/images/card_images/large/S8/040000_P_RUJURA.jpg". */
  imgPath: string | null;
}

interface JaRecord extends CrawlRecord, JaCardFields {}

const politeGet = createPoliteFetcher();

function detailUrlForId(id: number): string {
  return `${ORIGIN}/card-search/details.php/card/${id}/regu/all`;
}

function parseDetail(htmlBody: string): JaCardFields {
  const $ = cheerio.load(htmlBody);

  const imgPath = $("img.fit").first().attr("src") ?? null;
  const name = $("h1.Heading1").first().text().trim() || null;

  // <div class="subtext"><img class="img-regulation" alt="S8"/> 038 / 100 <img rarity/></div>
  const subtext = $(".subtext").first();
  const setCode = subtext.find("img.img-regulation").first().attr("alt")?.trim() || null;

  // Strip the nbsp padding around "038 / 100" and take the left half.
  const numberText = subtext.text().replace(/ /g, " ").trim();
  const number = /(\d+)\s*\/\s*\d+/.exec(numberText)?.[1] ?? null;

  return { setCode, number, name, imgPath };
}

async function probe() {
  console.log("Probing the id space...");
  // Walk upward until a run of misses, then binary-search the boundary.
  let lo = 1;
  let hi = 1;
  for (const candidate of [8_000, 16_000, 32_000, 64_000, 128_000]) {
    const res = await politeGet(detailUrlForId(candidate));
    console.log(`  id ${candidate}: ${res.status}`);
    if (res.status === 200) lo = candidate;
    else {
      hi = candidate;
      break;
    }
  }
  if (hi <= lo) hi = lo * 2;

  while (hi - lo > 250) {
    const mid = Math.floor((lo + hi) / 2);
    const res = await politeGet(detailUrlForId(mid));
    if (res.status === 200) lo = mid;
    else hi = mid;
    console.log(`  bisect ${mid}: ${res.status} -> [${lo}, ${hi}]`);
  }
  console.log(`\nHighest live id is between ${lo} and ${hi}. Sweep --to=${hi}.`);
}

async function sweep(from: number, to: number) {
  const cache = openCrawlCache<JaRecord>(CACHE_NAME);
  const todo: number[] = [];
  for (let id = from; id <= to; id++) if (!cache.seen.has(id)) todo.push(id);

  const etaHours = ((todo.length * 1.8) / 3600).toFixed(1);
  console.log(`Sweeping ${from}..${to}: ${todo.length} ids to fetch (~${etaHours}h).`);

  let hits = 0;
  try {
    for (const [i, id] of todo.entries()) {
      const res = await politeGet(detailUrlForId(id));
      if (res.status !== 200) {
        // 302 is this site's "no such card" — expected for most of the space.
        cache.append({ id, status: res.status, setCode: null, number: null, name: null, imgPath: null });
      } else {
        cache.append({ id, status: 200, ...parseDetail(res.body) });
        hits++;
      }
      if ((i + 1) % 250 === 0) {
        console.log(`  ${i + 1}/${todo.length} fetched, ${hits} cards found (at id ${id})`);
      }
    }
  } catch (err) {
    if (err instanceof CrawlAbortedError) {
      console.error(`\n${err.message}\nProgress is cached — rerun to resume.`);
    } else throw err;
  } finally {
    cache.close();
  }
  console.log(`Done. ${hits} cards found this run; ${cache.seen.size} ids cached total.`);
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
  const cache = openCrawlCache<JaRecord>(CACHE_NAME);
  const records = cache.all().filter((r) => r.status === 200 && r.setCode && r.number && r.imgPath);
  cache.close();
  console.log(`Usable cached records: ${records.length}`);

  const catalog = await db.catalogItem.findMany({
    where: { gameId: "pokemon", externalId: { startsWith: `${LANG}:` } },
    select: { externalId: true, name: true, imageSmallUrl: true },
  });
  const byExternalId = new Map(catalog.map((c) => [c.externalId, c]));

  const entries: CardImageEntry[] = [];
  const review: CardImageReviewEntry[] = [];

  for (const rec of records) {
    const sourceUrl = detailUrlForId(rec.id);
    const base = {
      sourceId: rec.id,
      sourceUrl,
      sourceName: rec.name ?? "",
      sourceSetLabel: rec.setCode ?? "",
      sourceNumber: rec.number ?? "",
    };

    const candidates = [
      `${LANG}:${rec.setCode}-${rec.number!.padStart(3, "0")}`,
      `${LANG}:${rec.setCode}-${rec.number}`,
    ];
    const externalId = candidates.find((c) => byExternalId.has(c));

    if (!externalId) {
      review.push({ ...base, reason: "no-catalog-row", candidateExternalId: candidates[0] });
      continue;
    }

    const row = byExternalId.get(externalId)!;

    // The name guard — see crawl-pokemon-tw-images.ts. This is what
    // independently catches a wrong set code, bad number padding, or the page
    // structure drifting. Never loosen it to raise the fill rate.
    if (!rec.name || normalizeName(rec.name) !== normalizeName(row.name)) {
      review.push({
        ...base,
        reason: "name-mismatch",
        candidateExternalId: externalId,
        catalogName: row.name,
      });
      continue;
    }

    if (row.imageSmallUrl) continue;

    // Only the `large` size exists — `small`/`middle` 404 — so both columns
    // get the same URL.
    const url = `${ORIGIN}${rec.imgPath}`;
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
      "Japanese card images from the official pokemon-card.com card database, crawled " +
      "offline by scripts/crawl-pokemon-ja-images.ts. Image URLs are hotlinked from the " +
      "publisher's CDN, never re-hosted. Every entry passed a set-code, catalog-row and " +
      "card-name match against our catalog.",
    verified: false,
    generatedAt: new Date().toISOString(),
    entries,
  };
  fs.writeFileSync(path.join(OUT_DIR, "pokemon-ja.json"), JSON.stringify(out, null, 2));

  const reviewOut: CardImageReviewFile = {
    gameId: "pokemon",
    note: "Crawled ja cards that did NOT pass the mapping guards. Never seeded.",
    generatedAt: new Date().toISOString(),
    entries: review,
  };
  fs.writeFileSync(path.join(OUT_DIR, "pokemon-ja.review.json"), JSON.stringify(reviewOut, null, 2));

  const byReason = review.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nMapped:   ${entries.length}`);
  console.log(`Review:   ${review.length}`, byReason);
  console.log(`\nWrote pokemon-ja.json (verified: false — review, then flip it).`);
}

function numArg(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`));
  const n = raw ? Number(raw.slice(name.length + 3)) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === "probe") await probe();
  else if (cmd === "sweep") await sweep(numArg("from", 1), numArg("to", DEFAULT_MAX_ID));
  else if (cmd === "derive") await derive();
  else {
    console.error("Usage: crawl-pokemon-ja-images.ts <probe|sweep|derive> [--from=N] [--to=N]");
    process.exit(1);
  }
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
