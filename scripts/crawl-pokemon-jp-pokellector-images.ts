/**
 * Backfills images for Japanese Pokémon cards from jp.pokellector.com, a fan
 * card database — a second source alongside scripts/crawl-pokemon-ja-images.ts
 * (the official pokemon-card.com crawler).
 *
 * Why a second source: pokemon-card.com only exposes cards by a full ~52k id
 * sweep (slow, and its id space doesn't reach pre-2006 cards at all).
 * Pokéllector is cheap to enumerate instead — its `/sets` page lists every JP
 * set on one page (204 of them), and each set's card list renders in full on
 * one unpaginated page (verified against VMAX Climax, 285 cards, one
 * request) — so this crawler targets only the sets that actually have gaps
 * in the DB, the same cheaper approach as crawl-pokemon-tw-images.ts, rather
 * than a brute-force id sweep.
 *
 * Only the URL is stored; images are hotlinked from pokellector's own CDN
 * (den-cards.pokellector.com) and never re-hosted. Every row written here is
 * identifiable by hostname so the whole set can be dropped with one
 * statement if that call is ever revisited.
 *
 * The guard chain and file writing live in scripts/lib/source-pipeline.ts;
 * the secondary EN-name guard below is this source's own addition to it.
 *
 *   npx tsx scripts/crawl-pokemon-jp-pokellector-images.ts index
 *   npx tsx scripts/crawl-pokemon-jp-pokellector-images.ts crawl [--sets=S8b,M6A]
 *   npx tsx scripts/crawl-pokemon-jp-pokellector-images.ts derive
 */
import * as path from "node:path";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { resolvePokemonCardNameEn } from "@/lib/games/pokemon/card-name-en";
import { setCodesWithMissingCardImages } from "@/lib/content-gaps";
import { createPoliteFetcher, CrawlAbortedError } from "./lib/polite-fetch";
import { type CrawlRecord } from "./lib/crawl-cache";
import { openJsonCache } from "./lib/json-cache";
import { normalizeNameCjk } from "./lib/normalize";
import { argList, runScript, usage, verb } from "./lib/cli";
import { writeReviewFile } from "./lib/source-output";
import {
  deriveFromCache,
  withResumableCache,
  writeDeriveOutput,
  type CardImageSource,
  type CatalogRow,
  type DeriveResult,
} from "./lib/source-pipeline";

const ORIGIN = "https://jp.pokellector.com";
const LANG = "ja";
const CACHE_NAME = "pokemon-jp-pokellector-crawl";
const SETS_INDEX_CACHE = "pokemon-jp-pokellector-sets";
const OUT_DIR = path.join(process.cwd(), "scripts", "data", "card-images");

interface PokellectorRecord extends CrawlRecord {
  /** The DB's own Set.code for the set we found this card under — carried
   *  through rather than re-derived from the page, so we never have to
   *  case-match pokellector's own (differently-cased) set code. */
  dbSetCode: string | null;
  /** Collector number as printed, e.g. "038" (left half of "038/100"). */
  number: string | null;
  /** The JPN: field on the detail page — the authoritative native-script name. */
  nameJa: string | null;
  /** Full-size image URL. */
  imageUrl: string | null;
  /** Path of the detail page this was read off, e.g.
   *  "/30th-Celebration-Japanese-Expansion/Greninja-ex-Card-15" — pokellector
   *  has no id-keyed URL, so this is the only way back to the source page. */
  href: string | null;
}

const politeGet = createPoliteFetcher();

/** setCode (as pokellector prints it, e.g. "S8B") -> set slug, e.g. "VMAX-Climax-Expansion". */
function setsIndex() {
  return openJsonCache<string>(SETS_INDEX_CACHE);
}

async function index() {
  console.log("Fetching /sets...");
  const res = await politeGet(`${ORIGIN}/sets`);
  if (res.status !== 200) throw new Error(`GET /sets -> ${res.status}`);

  const slugs = [...new Set([...res.body.matchAll(/href="(\/[A-Za-z0-9-]+-Expansion\/)"/g)].map((m) => m[1]))];
  console.log(`Found ${slugs.length} set pages. Indexing each for its set code...`);

  const cache = setsIndex();
  let indexed = 0;
  try {
    for (const [i, slug] of slugs.entries()) {
      const setRes = await politeGet(`${ORIGIN}${slug}`);
      if (setRes.status !== 200) continue;

      // <meta name="keywords" content="pokemon cards, VMAX Climax, cardlist, setlist, S8B">
      const keywords = /<meta name="keywords" content="([^"]*)"/.exec(setRes.body)?.[1] ?? "";
      const code = keywords.split(",").pop()?.trim();
      if (code) {
        cache.set(code.toUpperCase(), slug);
        indexed++;
      }
      if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${slugs.length} set pages indexed`);
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

interface EnumeratedCard {
  id: number;
  href: string;
}

async function enumerateSet(slug: string): Promise<EnumeratedCard[]> {
  const res = await politeGet(`${ORIGIN}${slug}`);
  if (res.status !== 200) return [];

  // <a href="/30th-Celebration-Japanese-Expansion/Greninja-ex-Card-15" name="card61681" ...>
  const cards: EnumeratedCard[] = [];
  const seen = new Set<number>();
  for (const m of res.body.matchAll(/<a href="(\/[^"]+)" name="card(\d+)"/g)) {
    const id = Number(m[2]);
    if (seen.has(id)) continue;
    seen.add(id);
    cards.push({ id, href: m[1] });
  }
  return cards;
}

function parseDetail(htmlBody: string): { number: string | null; nameJa: string | null; imageUrl: string | null } {
  const $ = cheerio.load(htmlBody);

  // <div><strong>JPN:</strong> <a href="...">ゲッコウガex</a></div>
  const nameJa =
    $('strong:contains("JPN:")').first().parent().find("a").first().text().trim() || null;

  // <div><strong>Card:</strong> <a href="...">15/103</a></div>
  const cardText =
    $('strong:contains("Card:")').first().parent().find("a").first().text().trim() || "";
  const number = /^(\d+)\s*\/\s*\d+/.exec(cardText)?.[1] ?? null;

  const imageUrl = $('img[src*="den-cards.pokellector.com"]').first().attr("src") ?? null;

  return { number, nameJa, imageUrl };
}

/**
 * Our earliest 4 sets (PMCG1-4) predate pokellector's own JA code scheme —
 * it catalogs them under its own original-release codes instead, confirmed
 * by matching card counts (EXP=102, B02=48, B03=48, B04=65, exactly our
 * PMCG1/2/3/4). Every other DB code (including neo1-4) already matches
 * pokellector's own code directly, so this only needs the 4 exceptions.
 */
const DB_CODE_TO_POKELLECTOR_CODE: Record<string, string> = {
  PMCG1: "EXP",
  PMCG2: "B02",
  PMCG3: "B03",
  PMCG4: "B04",
};

/** Listing pages link the thumb variant; the detail page's <img> is the full
 *  size, so the small URL is derivable without an extra request. */
function toThumbUrl(imageUrl: string): string {
  return imageUrl.replace(/\.png$/, ".thumb.png");
}

/**
 * Fallback for sets old enough that the detail page prints no "Card:" field
 * at all (confirmed: pre-2003 sets like Base Set never printed a collector
 * number on the card, so pokellector has nothing to show there either).
 * Every enumerated card's href still ends in "-<N>" regardless
 * ("/Expansion-Pack-Expansion/Bulbasaur-Expansion-Pack-EXP-1",
 * "/Pokemon-Jungle-Expansion/Nidoran-Card-1") — verified against our own
 * catalog for several of these (id 37257 "-7" is our PMCG1-007, Tangela).
 * Only used when the primary "Card:" parse came back empty.
 */
function numberFromHref(href: string): string | null {
  const m = /-(\d+)$/.exec(href);
  return m ? m[1] : null;
}

/**
 * Pokéllector's own JPN: field has its own scrape artifacts on some of these
 * older cards — stray hyphens mid-name ("ライト-デュー-ゴング") and, rarer,
 * a whole-name repeat ("ライトアズマリルアズマリルアズマリル"). Yields
 * candidates from least to most aggressive cleanup: the raw name first, then
 * hyphens stripped, then (only as a last resort) an exact repeated-string
 * pattern collapsed to one copy. That ordering matters — several *real*
 * Japanese Pokémon names legitimately double a syllable (ホーホー Hoothoot,
 * タマタマ Exeggcute, ツボツボ Shuckle), so collapsing repeats unconditionally
 * would mangle those; the caller only advances to a later candidate when the
 * earlier one fails to resolve to anything.
 */
function* pokellectorNameCandidates(name: string): Generator<string> {
  yield name;
  const dehyphenated = name.replace(/-/g, "");
  if (dehyphenated !== name) yield dehyphenated;
  for (let reps = 4; reps >= 2; reps--) {
    if (dehyphenated.length % reps !== 0) continue;
    const chunk = dehyphenated.slice(0, dehyphenated.length / reps);
    if (chunk && dehyphenated === chunk.repeat(reps)) {
      yield chunk;
      return;
    }
  }
}

/** First candidate (see pokellectorNameCandidates) that resolves to an English name, plus that resolved name. */
function resolveWithCleanup(name: string): { cleaned: string; en: string } | undefined {
  for (const candidate of pokellectorNameCandidates(name)) {
    const en = resolvePokemonCardNameEn(candidate, "JP");
    if (en) return { cleaned: candidate, en };
  }
  return undefined;
}

/** Counted for the summary; reset at the start of each derive. */
let matchedViaEnGuard = 0;

const source: CardImageSource<PokellectorRecord> = {
  name: "pokemon-jp-pokellector",
  cacheName: CACHE_NAME,
  lang: LANG,
  outDir: OUT_DIR,
  sourceNote:
    "Japanese card images from jp.pokellector.com (a fan card database), crawled offline " +
    "by scripts/crawl-pokemon-jp-pokellector-images.ts. A second JP source alongside " +
    "pokemon-ja.json (pokemon-card.com), used because pokellector's sets are cheap to " +
    "enumerate by set rather than requiring a full id-space sweep. Image URLs are " +
    "hotlinked from the publisher's CDN, never re-hosted. Every entry passed a set-code, " +
    "catalog-row and card-name match against our catalog.",
  reviewNote: "Crawled jp.pokellector.com cards that did NOT pass the mapping guards. Never seeded.",
  // Backfill `number` from the href for pages whose detail page prints no
  // "Card:" field at all — see numberFromHref's doc comment.
  prepare: (r) => ({ ...r, number: r.number ?? (r.href ? numberFromHref(r.href) : null) }),
  isParseable: (r) => Boolean(r.dbSetCode && r.number && r.nameJa && r.imageUrl && r.href),
  sourceUrl: (r) => (r.href ? `${ORIGIN}${r.href}` : `${ORIGIN} (id ${r.id}, no href captured)`),
  provenance: (r) => ({
    sourceName: r.nameJa ?? "",
    sourceSetLabel: r.dbSetCode ?? "",
    sourceNumber: r.number ?? "",
  }),
  // dbSetCode is our OWN code, carried through the crawl, so a lookup miss
  // here is never an unknown set — it is always a missing card row.
  sourceSetCode: () => null,
  // Numbers are stored zero-padded to 3 (ja:S8b-001), with a rare unpadded
  // promo — try both rather than guessing.
  candidates: (r) => [
    `${LANG}:${r.dbSetCode}-${r.number!.padStart(3, "0")}`,
    `${LANG}:${r.dbSetCode}-${r.number}`,
  ],
  nameGuard: (rec, row) => {
    if (rec.nameJa != null && normalizeNameCjk(rec.nameJa) === normalizeNameCjk(row.name)) {
      return { ok: true };
    }
    if (!rec.nameJa) return { ok: false, reason: "name-mismatch", catalogName: row.name };

    // Secondary guard: some catalog rows carry a same-species name that's
    // spelled slightly differently from pokellector's (e.g. a missing
    // long-vowel mark), which fails the raw-text compare above but is
    // still clearly the same card — resolve both sides to English and
    // accept an exact match there. This never masks a real identity
    // mismatch: it only fires when both names independently resolve to a
    // Pokémon/card species, so an actual wrong-card page still lands in
    // review below (case A). It also positively identifies catalog rows
    // whose *own* name is corrupted (case B — see backfill history: a
    // slice of the Neo-series rows carry a literal machine-translation
    // of the English name, e.g. name "奇妙な" ["strange"] for what should
    // be Oddish's ナゾノクサ) — those get their catalog name corrected
    // here rather than just having their image silently skipped forever.
    const pok = resolveWithCleanup(rec.nameJa);
    const catEn = resolvePokemonCardNameEn(row.name, "JP");

    if (pok && catEn && pok.en === catEn) {
      // case A: same species, just a spelling variant — leave catalog name as-is
      matchedViaEnGuard++;
      return { ok: true };
    }
    if (pok && !catEn && row.cardType === "Pokémon") {
      // case B: our own name doesn't resolve to anything (strong signal
      // it's corrupted) and pokellector's does — trust pokellector's,
      // corrected name gets a human look before a backfill applies it,
      // same verified:false gate as the image file. Restricted to cardType
      // "Pokémon": the species table is comprehensive, so an unresolved
      // species name really does mean corruption. Trainer/character names
      // are only ever resolved via a deliberately closed curated list, so
      // "unresolved" there just means "not curated" — proven unsafe to
      // trust blind: pokellector's own JPN: field for
      // Double-Blaze-Expansion/Kiawe-Card-94 reads "シロナ" (Cynthia) even
      // though the card, by its own URL and English name, is Kiawe — a
      // data error on pokellector's side that this guard would otherwise
      // have "corrected" our (correct) カキ into.
      return {
        ok: true,
        correction: { externalId: row.externalId, oldName: row.name, newName: pok.cleaned },
      };
    }
    return { ok: false, reason: "name-mismatch", catalogName: row.name };
  },
  imageUrls: (r) => ({ small: toThumbUrl(r.imageUrl!), large: r.imageUrl! }),
  mappedSuffix: () => `${matchedViaEnGuard} via the secondary EN-name guard`,
  extraLines: (result: DeriveResult) => [
    `Corrections proposed: ${result.corrections.length} (pokemon-jp-pokellector.name-corrections.json)`,
  ],
};

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

  await withResumableCache<PokellectorRecord>(CACHE_NAME, async (cache) => {
    for (const [i, dbSetCode] of codes.entries()) {
      const pokellectorCode = DB_CODE_TO_POKELLECTOR_CODE[dbSetCode.toUpperCase()] ?? dbSetCode;
      const slug = index.get(pokellectorCode.toUpperCase());
      if (!slug) {
        unmatched.push(dbSetCode);
        continue;
      }

      const enumerated = await enumerateSet(slug);
      const todo = enumerated.filter((c) => !cache.seen.has(c.id));
      console.log(
        `[${i + 1}/${codes.length}] ${dbSetCode} (${slug}): ${enumerated.length} cards, ${todo.length} to fetch`
      );

      for (const { id, href } of todo) {
        const res = await politeGet(`${ORIGIN}${href}`);
        if (res.status !== 200) {
          cache.append({ id, status: res.status, dbSetCode, number: null, nameJa: null, imageUrl: null, href });
          continue;
        }
        cache.append({ id, status: 200, dbSetCode, href, ...parseDetail(res.body) });
      }
    }
  });

  if (unmatched.length) {
    console.log(`\nNo pokellector set found for ${unmatched.length} DB set code(s): ${unmatched.join(", ")}`);
  }
}

async function derive() {
  matchedViaEnGuard = 0;

  const catalog = await db.catalogItem.findMany({
    where: { gameId: "pokemon", externalId: { startsWith: `${LANG}:` } },
    select: { externalId: true, name: true, imageSmallUrl: true, cardType: true },
  });
  const byExternalId = new Map<string, CatalogRow>(catalog.map((c) => [c.externalId, c]));

  const result = deriveFromCache({ source, byExternalId });

  writeReviewFile(OUT_DIR, "pokemon-jp-pokellector.name-corrections.json", {
    note:
      "Catalog Set.name/CatalogItem.name corrections proposed from pokellector's JPN: field, for rows " +
      "whose current catalog name did not resolve via resolvePokemonCardNameEn (see the secondary " +
      "name guard in crawl-pokemon-jp-pokellector-images.ts). Not applied automatically — spot-check " +
      "against sourceUrl, then apply by hand.",
    entries: result.corrections,
  });

  writeDeriveOutput(source, result);
}

async function main() {
  const cmd = verb();
  if (cmd === "index") await index();
  else if (cmd === "crawl") await crawl(argList("sets"));
  else if (cmd === "derive") await derive();
  else usage("Usage: crawl-pokemon-jp-pokellector-images.ts <index|crawl|derive> [--sets=S8b,M6A]");
}

void runScript(main, () => db.$disconnect());
