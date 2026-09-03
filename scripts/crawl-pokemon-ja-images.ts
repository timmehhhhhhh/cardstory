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
 * The crawl/derive machinery and the guard chain live in
 * scripts/lib/source-pipeline.ts; this file is just what makes this source
 * different from the others.
 *
 *   npx tsx scripts/crawl-pokemon-ja-images.ts probe
 *   npx tsx scripts/crawl-pokemon-ja-images.ts sweep [--from=1] [--to=52000]
 *   npx tsx scripts/crawl-pokemon-ja-images.ts derive
 */
import * as path from "node:path";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { bareSetCode } from "@/lib/content-gaps";
import { createPoliteFetcher } from "./lib/polite-fetch";
import { type CrawlRecord } from "./lib/crawl-cache";
import { normalizeNameCjk } from "./lib/normalize";
import { argNumber, runScript, usage, verb } from "./lib/cli";
import {
  deriveFromCache,
  runIdCrawl,
  writeDeriveOutput,
  type CardImageSource,
  type CatalogRow,
} from "./lib/source-pipeline";

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
  const numberText = subtext.text().replace(/ /g, " ").trim();
  const number = /(\d+)\s*\/\s*\d+/.exec(numberText)?.[1] ?? null;

  return { setCode, number, name, imgPath };
}

const source: CardImageSource<JaRecord> = {
  name: "pokemon-ja",
  cacheName: CACHE_NAME,
  lang: LANG,
  outDir: OUT_DIR,
  sourceNote:
    "Japanese card images from the official pokemon-card.com card database, crawled " +
    "offline by scripts/crawl-pokemon-ja-images.ts. Image URLs are hotlinked from the " +
    "publisher's CDN, never re-hosted. Every entry passed a set-code, catalog-row and " +
    "card-name match against our catalog.",
  reviewNote: "Crawled ja cards that did NOT pass the mapping guards. Never seeded.",
  isParseable: (r) => Boolean(r.setCode && r.number && r.imgPath),
  sourceUrl: (r) => detailUrlForId(r.id),
  provenance: (r) => ({
    sourceName: r.name ?? "",
    sourceSetLabel: r.setCode ?? "",
    sourceNumber: r.number ?? "",
  }),
  sourceSetCode: (r) => r.setCode,
  // Number padding varies between the site and our catalog, so try the padded
  // form first and fall back to the raw one.
  candidates: (r) => [
    `${LANG}:${r.setCode}-${r.number!.padStart(3, "0")}`,
    `${LANG}:${r.setCode}-${r.number}`,
  ],
  nameGuard: (r, row) =>
    r.name && normalizeNameCjk(r.name) === normalizeNameCjk(row.name)
      ? { ok: true }
      : { ok: false, reason: "name-mismatch", catalogName: row.name },
  // Only the `large` size exists — `small`/`middle` 404 — so both columns get
  // the same URL.
  imageUrls: (r) => ({ small: `${ORIGIN}${r.imgPath}`, large: `${ORIGIN}${r.imgPath}` }),
};

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
  const ids: number[] = [];
  for (let id = from; id <= to; id++) ids.push(id);
  console.log(`Sweeping ${from}..${to} (~${((ids.length * 1.8) / 3600).toFixed(1)}h if none are cached).`);
  await runIdCrawl<JaRecord>({
    cacheName: CACHE_NAME,
    ids,
    politeGet,
    url: detailUrlForId,
    record: (id, res) => ({ id, status: 200, ...parseDetail(res.body) }),
    // 302 is this site's "no such card" — expected for most of the space.
    emptyRecord: (id, status) => ({ id, status, setCode: null, number: null, name: null, imgPath: null }),
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
  if (cmd === "probe") await probe();
  else if (cmd === "sweep") await sweep(argNumber("from", 1), argNumber("to", DEFAULT_MAX_ID));
  else if (cmd === "derive") await derive();
  else usage("Usage: crawl-pokemon-ja-images.ts <probe|sweep|derive> [--from=N] [--to=N]");
}

void runScript(main, () => db.$disconnect());
