/**
 * Backfills images for Japanese Pokémon cards from pricecharting.com — a
 * fifth source alongside crawl-pokemon-ja-images.ts (pokemon-card.com),
 * crawl-pokemon-jp-pokellector-images.ts (jp.pokellector.com) and
 * crawl-pokemon-jp-uk-images.ts (japanesepokemoncards.uk).
 *
 * Why this exists: tcgdex — our JP catalog provider — has no asset yet for
 * some recently-released JP sets (verified: api.tcgdex.net/v2/ja/cards/M6-*
 * returns image: null across the whole "Storm Emeralda" set). PriceCharting
 * carries JP Pokémon consoles under one listing page,
 * https://www.pricecharting.com/category/pokemon-cards, and each console's
 * own page (https://www.pricecharting.com/console/pokemon-japanese-<slug>)
 * renders its entire card list on one unpaginated page — name, collector
 * number and a thumbnail image per row, no per-card detail fetch required.
 * Verified against Storm Emeralda: 115 product rows in one request.
 *
 * PriceCharting prints English names ("Mega Rayquaza ex #110"), not the real
 * Japanese text — same situation as crawl-pokemon-jp-uk-images.ts, so this
 * borrows that source's name guard: resolve the catalog's Japanese name to
 * an expected English name via resolvePokemonCardNameEn and compare that,
 * rather than a native-script compare. A card whose name doesn't resolve
 * that way (mostly Trainer/Item cards outside the curated translation
 * table) is routed to review rather than trusted blind.
 *
 * The full-size image is derivable without an extra request: the listing
 * page's thumbnail (".../<hash>/60.jpg") and a card's own full-size image
 * (".../<hash>/1600.jpg") share the same hash — verified against Storm
 * Emeralda's "Mega Rayquaza ex #110" detail page.
 *
 * Only the URL is stored; images are hotlinked from PriceCharting's own CDN
 * (storage.googleapis.com/images.pricecharting.com) and never re-hosted.
 * Every row written here is identifiable by hostname so the whole set can be
 * dropped with one statement if that call is ever revisited.
 *
 * The guard chain and file writing live in scripts/lib/source-pipeline.ts;
 * the EN-name guard below is this source's own addition to it (same shape as
 * crawl-pokemon-jp-uk-images.ts's).
 *
 *   npx tsx scripts/crawl-pokemon-jp-pricecharting-images.ts index
 *   npx tsx scripts/crawl-pokemon-jp-pricecharting-images.ts crawl [--sets=M6]
 *   npx tsx scripts/crawl-pokemon-jp-pricecharting-images.ts derive
 */
import * as path from "node:path";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { resolvePokemonCardNameEn } from "@/lib/games/pokemon/card-name-en";
import { setCodesWithMissingCardImages } from "@/lib/content-gaps";
import { createPoliteFetcher, CrawlAbortedError } from "./lib/polite-fetch";
import { type CrawlRecord } from "./lib/crawl-cache";
import { openJsonCache } from "./lib/json-cache";
import { normalizeNameAsciiEn } from "./lib/normalize";
import { argList, runScript, usage, verb } from "./lib/cli";
import {
  deriveFromCache,
  withResumableCache,
  writeDeriveOutput,
  type CardImageSource,
  type CatalogRow,
} from "./lib/source-pipeline";

const ORIGIN = "https://www.pricecharting.com";
const LANG = "ja";
const CACHE_NAME = "pokemon-jp-pricecharting-crawl";
const SETS_INDEX_CACHE = "pokemon-jp-pricecharting-sets";
const OUT_DIR = path.join(process.cwd(), "scripts", "data", "card-images");

/** Kept separate from PriceChartingRecord: CrawlRecord's index signature makes
 *  Omit<> on the combined type collapse to `unknown` (see the equivalent
 *  comment in crawl-pokemon-ja-images.ts). */
interface PriceChartingCardFields {
  /** The DB's own Set.code for the set this console page was fetched under —
   *  carried through the crawl rather than re-derived from the page, so a
   *  lookup miss at derive time is never mistaken for an unknown set. */
  dbSetCode: string;
  /** Card's own page, e.g. "/game/pokemon-japanese-storm-emeralda/mega-rayquaza-ex-110". */
  href: string | null;
  /** English name as printed, e.g. "Mega Rayquaza ex" (the "#N" suffix stripped). */
  name: string | null;
  /** Collector number as printed, e.g. "110". */
  number: string | null;
  /** Listing-page thumbnail, e.g. ".../<hash>/60.jpg" — the full-size image is derived from this. */
  thumbUrl: string | null;
}

interface PriceChartingRecord extends CrawlRecord, PriceChartingCardFields {}

const politeGet = createPoliteFetcher();

/** setCode (as PriceCharting's own "Set Code:" label prints it, uppercased) -> console path, e.g. "/console/pokemon-japanese-storm-emeralda". */
function setsIndex() {
  return openJsonCache<string>(SETS_INDEX_CACHE);
}

async function index() {
  console.log("Fetching /category/pokemon-cards...");
  const res = await politeGet(`${ORIGIN}/category/pokemon-cards`);
  if (res.status !== 200) throw new Error(`GET /category/pokemon-cards -> ${res.status}`);

  const slugs = [
    ...new Set([...res.body.matchAll(/href="(\/console\/pokemon-japanese[^"]*)"/g)].map((m) => m[1])),
  ];
  console.log(`Found ${slugs.length} JP console pages. Indexing each for its set code...`);

  const cache = setsIndex();
  let indexed = 0;
  try {
    for (const [i, slug] of slugs.entries()) {
      const setRes = await politeGet(`${ORIGIN}${slug}`);
      if (setRes.status !== 200) continue;

      // <img class="set-logo" alt="Set Code: m6" title="Set Code: m6" .../>
      // Older/promo consoles don't carry this label at all — left out of the
      // index rather than guessed, same documented-gap treatment
      // crawl-pokemon-jp-uk-images.ts gives the Gym-era sets it excludes.
      const code = /alt="Set Code:\s*([^"]+)"/i.exec(setRes.body)?.[1]?.trim();
      if (code) {
        cache.set(code.toUpperCase(), slug);
        indexed++;
      }
      if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${slugs.length} console pages indexed`);
    }
  } catch (err) {
    if (err instanceof CrawlAbortedError) {
      console.error(`\n${err.message}\nPartial index is written — rerun to continue.`);
    } else throw err;
  } finally {
    cache.save();
  }
  console.log(`\nIndexed ${indexed} sets (${Object.keys(cache.data).length} total in index).`);
}

interface ParsedRow extends Omit<PriceChartingCardFields, "dbSetCode"> {
  id: number;
}

function parseListing(htmlBody: string): ParsedRow[] {
  const $ = cheerio.load(htmlBody);
  const rows: ParsedRow[] = [];

  $('tr[id^="product-"]').each((_, el) => {
    const $row = $(el);
    const id = Number($row.attr("data-product"));
    if (!Number.isFinite(id)) return;

    const $titleLink = $row.find("td.title a").first();
    // "Mega Rayquaza ex #110" -> name "Mega Rayquaza ex", number "110".
    // Non-card products ("Booster Box", ...) print no "#N" suffix at all and
    // are left with name/number null, which fails isParseable below.
    const m = /^(.*)\s#(\d+)$/.exec($titleLink.text().trim());

    rows.push({
      id,
      href: $titleLink.attr("href") ?? null,
      name: m ? m[1].trim() : null,
      number: m ? m[2] : null,
      thumbUrl: $row.find("td.image img.photo").first().attr("src") ?? null,
    });
  });
  return rows;
}

async function crawl(only?: string[]) {
  const index = setsIndex();
  if (Object.keys(index.data).length === 0) {
    console.error("No sets index found — run the `index` command first.");
    process.exitCode = 1;
    return;
  }

  const codes = only?.length ? only : await setCodesWithMissingCardImages(LANG);
  console.log(`Sets to consider: ${codes.length}`);

  const unmatched: string[] = [];

  await withResumableCache<PriceChartingRecord>(CACHE_NAME, async (cache) => {
    for (const [i, dbSetCode] of codes.entries()) {
      const slug = index.get(dbSetCode.toUpperCase());
      if (!slug) {
        unmatched.push(dbSetCode);
        continue;
      }

      const res = await politeGet(`${ORIGIN}${slug}`);
      if (res.status !== 200) {
        console.log(`[${i + 1}/${codes.length}] ${dbSetCode} (${slug}): GET -> ${res.status}, skipping`);
        continue;
      }

      const rows = parseListing(res.body);
      const todo = rows.filter((r) => !cache.seen.has(r.id));
      console.log(
        `[${i + 1}/${codes.length}] ${dbSetCode} (${slug}): ${rows.length} rows, ${todo.length} new`
      );
      for (const row of todo) {
        cache.append({ ...row, status: 200, dbSetCode });
      }
    }
  });

  if (unmatched.length) {
    console.log(`\nNo PriceCharting console found for ${unmatched.length} DB set code(s): ${unmatched.join(", ")}`);
  }
}

/** ".../<hash>/60.jpg" -> ".../<hash>/<size>.jpg". */
function toSizedUrl(thumbUrl: string, size: number): string {
  return thumbUrl.replace(/\/\d+\.jpg$/, `/${size}.jpg`);
}

/**
 * Verified PriceCharting printed-number errors: "<dbSetCode>:<PriceCharting
 * number>" -> the actual tcgdex collector number. So far just Storm
 * Emeralda's #98/#99 pair, confirmed independently of the name guard (which
 * can't see this — it only compares within one already-chosen candidate):
 * PriceCharting's "#98 Pokemon Catcher" and "#99 Custom Vest" are transposed
 * against tcgdex's numbering — trainerType only lines up when swapped
 * (Pokémon Catcher is an Item, matching tcgdex M6-099; とくちゅうチョッキ
 * "Custom Vest" is a Tool, matching tcgdex M6-098).
 */
const NUMBER_OVERRIDES: Record<string, string> = {
  "M6:98": "99",
  "M6:99": "98",
};

const source: CardImageSource<PriceChartingRecord> = {
  name: "pokemon-jp-pricecharting",
  cacheName: CACHE_NAME,
  lang: LANG,
  outDir: OUT_DIR,
  sourceNote:
    "Japanese card images from pricecharting.com, crawled offline by " +
    "scripts/crawl-pokemon-jp-pricecharting-images.ts. A fifth JP source alongside pokemon-ja.json " +
    "(pokemon-card.com), pokemon-jp-pokellector.json (jp.pokellector.com) and pokemon-jp-uk.json " +
    "(japanesepokemoncards.uk). Image URLs are hotlinked from PriceCharting's own CDN " +
    "(storage.googleapis.com/images.pricecharting.com), never re-hosted. PriceCharting prints English " +
    "names, not the real Japanese text, so every entry passed a set-code/number match plus an " +
    "English-name guard (resolved from the catalog's Japanese name via resolvePokemonCardNameEn). " +
    "NUMBER_OVERRIDES in this file corrects a small number of confirmed PriceCharting-side printed-" +
    "number errors, found via manual review of the review file's rejections.",
  reviewNote: "Crawled pricecharting.com JP Pokémon console listings that did NOT pass the mapping guards. Never seeded.",
  isParseable: (r) => Boolean(r.name && r.number && r.thumbUrl && r.href),
  sourceUrl: (r) => (r.href ? `${ORIGIN}${r.href}` : `${ORIGIN} (id ${r.id}, no href captured)`),
  provenance: (r) => ({
    sourceName: r.name ?? "",
    sourceSetLabel: r.dbSetCode,
    sourceNumber: r.number ?? "",
  }),
  // dbSetCode is our OWN code, carried through the crawl (we only ever crawl
  // sets already resolved against the index), so a lookup miss here is never
  // an unknown set — it is always a missing card row.
  sourceSetCode: () => null,
  // Numbers are stored zero-padded to 3 (ja:M6-004), with a rare unpadded
  // promo — try both rather than guessing. NUMBER_OVERRIDES corrects a
  // handful of confirmed PriceCharting-side printed-number errors first.
  candidates: (r) => {
    const number = NUMBER_OVERRIDES[`${r.dbSetCode}:${r.number}`] ?? r.number!;
    return [`${LANG}:${r.dbSetCode}-${number.padStart(3, "0")}`, `${LANG}:${r.dbSetCode}-${number}`];
  },
  // See the module doc for why this compares resolved English names rather
  // than a native-script compare: PriceCharting's own text is English.
  // Never loosen it to raise the fill rate.
  nameGuard: (rec, row) => {
    const expectedNameEn = resolvePokemonCardNameEn(row.name, "JP");
    if (!expectedNameEn) {
      return { ok: false, reason: "unresolved-name-guard", catalogName: row.name };
    }
    return normalizeNameAsciiEn(expectedNameEn) === normalizeNameAsciiEn(rec.name!)
      ? { ok: true }
      : { ok: false, reason: "name-mismatch", catalogName: row.name };
  },
  imageUrls: (r) => ({ small: toSizedUrl(r.thumbUrl!, 240), large: toSizedUrl(r.thumbUrl!, 1600) }),
};

async function derive() {
  const catalog = await db.catalogItem.findMany({
    where: { gameId: "pokemon", externalId: { startsWith: `${LANG}:` } },
    select: { externalId: true, name: true, imageSmallUrl: true },
  });
  const byExternalId = new Map<string, CatalogRow>(catalog.map((c) => [c.externalId, c]));

  writeDeriveOutput(source, deriveFromCache({ source, byExternalId }));
}

async function main() {
  const cmd = verb();
  if (cmd === "index") await index();
  else if (cmd === "crawl") await crawl(argList("sets"));
  else if (cmd === "derive") await derive();
  else usage("Usage: crawl-pokemon-jp-pricecharting-images.ts <index|crawl|derive> [--sets=M6]");
}

void runScript(main, () => db.$disconnect());
