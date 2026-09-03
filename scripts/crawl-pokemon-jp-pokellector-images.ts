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
 *   npx tsx scripts/crawl-pokemon-jp-pokellector-images.ts index
 *   npx tsx scripts/crawl-pokemon-jp-pokellector-images.ts crawl [--sets=S8b,M6A]
 *   npx tsx scripts/crawl-pokemon-jp-pokellector-images.ts derive
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as cheerio from "cheerio";
import { db } from "../src/lib/db";
import { resolvePokemonCardNameEn } from "../src/lib/games/pokemon/card-name-en";
import { createPoliteFetcher, CrawlAbortedError } from "./lib/polite-fetch";
import { openCrawlCache, type CrawlRecord } from "./lib/crawl-cache";
import type {
  CardImageEntry,
  CardImageFile,
  CardImageReviewEntry,
  CardImageReviewFile,
} from "./data/card-images/types";

const ORIGIN = "https://jp.pokellector.com";
const LANG = "ja";
const CACHE_NAME = "pokemon-jp-pokellector-crawl";
const CACHE_DIR = path.join(process.cwd(), "scripts", ".cache");
const SETS_INDEX_FILE = path.join(CACHE_DIR, "pokemon-jp-pokellector-sets.json");
const OUT_DIR = path.join(process.cwd(), "scripts", "data", "card-images");

/** setCode (as pokellector prints it, e.g. "S8B") -> set slug, e.g. "VMAX-Climax-Expansion". */
type SetsIndex = Record<string, string>;

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

function loadSetsIndex(): SetsIndex {
  if (!fs.existsSync(SETS_INDEX_FILE)) return {};
  return JSON.parse(fs.readFileSync(SETS_INDEX_FILE, "utf-8")) as SetsIndex;
}

async function index() {
  console.log("Fetching /sets...");
  const res = await politeGet(`${ORIGIN}/sets`);
  if (res.status !== 200) throw new Error(`GET /sets -> ${res.status}`);

  const slugs = [...new Set([...res.body.matchAll(/href="(\/[A-Za-z0-9-]+-Expansion\/)"/g)].map((m) => m[1]))];
  console.log(`Found ${slugs.length} set pages. Indexing each for its set code...`);

  const out: SetsIndex = fs.existsSync(SETS_INDEX_FILE) ? loadSetsIndex() : {};
  let indexed = 0;
  try {
    for (const [i, slug] of slugs.entries()) {
      const setRes = await politeGet(`${ORIGIN}${slug}`);
      if (setRes.status !== 200) continue;

      // <meta name="keywords" content="pokemon cards, VMAX Climax, cardlist, setlist, S8B">
      const keywords = /<meta name="keywords" content="([^"]*)"/.exec(setRes.body)?.[1] ?? "";
      const code = keywords.split(",").pop()?.trim();
      if (code) {
        out[code.toUpperCase()] = slug;
        indexed++;
      }
      if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${slugs.length} set pages indexed`);
    }
  } catch (err) {
    if (err instanceof CrawlAbortedError) {
      console.error(`\n${err.message}\nPartial index is written — rerun to continue.`);
    } else throw err;
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(SETS_INDEX_FILE, JSON.stringify(out, null, 2));
  console.log(`\nIndexed ${indexed} sets (${Object.keys(out).length} total in index). Wrote ${SETS_INDEX_FILE}.`);
}

/** Set codes that still have cards without an image, oldest release first. */
async function targetSetCodes(): Promise<string[]> {
  const rows = await db.set.findMany({
    where: { id: { startsWith: `pokemon:${LANG}:` }, items: { some: { imageSmallUrl: null } } },
    select: { code: true },
    orderBy: { releaseDate: "asc" },
  });
  return rows.map((r) => r.code.replace(new RegExp(`^${LANG}:`), "")).filter(Boolean);
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
    $('strong:contains("JPN:")')
      .first()
      .parent()
      .find("a")
      .first()
      .text()
      .trim() || null;

  // <div><strong>Card:</strong> <a href="...">15/103</a></div>
  const cardText =
    $('strong:contains("Card:")')
      .first()
      .parent()
      .find("a")
      .first()
      .text()
      .trim() || "";
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

async function crawl(only?: string[]) {
  const setsIndex = loadSetsIndex();
  if (Object.keys(setsIndex).length === 0) {
    console.error("No sets index found — run the `index` command first.");
    process.exit(1);
  }

  const codes = only?.length ? only : await targetSetCodes();
  console.log(`Sets to consider: ${codes.length}`);

  const cache = openCrawlCache<PokellectorRecord>(CACHE_NAME);
  const unmatched: string[] = [];

  try {
    for (const [i, dbSetCode] of codes.entries()) {
      const pokellectorCode = DB_CODE_TO_POKELLECTOR_CODE[dbSetCode.toUpperCase()] ?? dbSetCode;
      const slug = setsIndex[pokellectorCode.toUpperCase()];
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
        const parsed = parseDetail(res.body);
        cache.append({ id, status: 200, dbSetCode, href, ...parsed });
      }
    }
  } catch (err) {
    if (err instanceof CrawlAbortedError) {
      console.error(`\n${err.message}\nProgress is cached — rerun to resume.`);
    } else throw err;
  } finally {
    cache.close();
  }

  if (unmatched.length) {
    console.log(`\nNo pokellector set found for ${unmatched.length} DB set code(s): ${unmatched.join(", ")}`);
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

/** Listing pages link the thumb variant; the detail page's <img> is the full
 *  size with the same filename minus ".thumb" — so the thumb is derivable
 *  without an extra request. */
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

/** A candidate catalog-name fix, surfaced alongside the image fill for a human to check before applying. */
interface NameCorrection {
  externalId: string;
  oldName: string;
  newName: string;
  sourceUrl: string;
}

async function derive() {
  const cache = openCrawlCache<PokellectorRecord>(CACHE_NAME);
  // Backfill `number` from the href for pages whose detail page prints no
  // "Card:" field at all — see numberFromHref's doc comment.
  const found = cache.all().filter((r) => r.status === 200).map((r) => ({
    ...r,
    number: r.number ?? (r.href ? numberFromHref(r.href) : null),
  }));
  // See crawl-pokemon-ja-images.ts — unparseable pages go to review, not the bin.
  const records = found.filter((r) => r.dbSetCode && r.number && r.nameJa && r.imageUrl && r.href);
  const unparseable = found.filter((r) => !(r.dbSetCode && r.number && r.nameJa && r.imageUrl && r.href));
  cache.close();
  console.log(`Cards found: ${found.length} (${records.length} parseable, ${unparseable.length} not)`);

  const catalog = await db.catalogItem.findMany({
    where: { gameId: "pokemon", externalId: { startsWith: `${LANG}:` } },
    select: { externalId: true, name: true, imageSmallUrl: true, cardType: true },
  });
  const byExternalId = new Map(catalog.map((c) => [c.externalId, c]));

  let alreadyHadImage = 0;
  let matchedViaEnGuard = 0;
  const entries: CardImageEntry[] = [];
  const corrections: NameCorrection[] = [];
  const review: CardImageReviewEntry[] = unparseable.map((r) => ({
    reason: "missing-page-fields" as const,
    sourceId: r.id,
    sourceUrl: r.href ? `${ORIGIN}${r.href}` : `${ORIGIN} (id ${r.id}, no href captured)`,
    sourceName: r.nameJa ?? "",
    sourceSetLabel: r.dbSetCode ?? "",
    sourceNumber: r.number ?? "",
  }));

  for (const rec of records) {
    const base = {
      sourceId: rec.id,
      sourceUrl: `${ORIGIN}${rec.href}`,
      sourceName: rec.nameJa ?? "",
      sourceSetLabel: rec.dbSetCode ?? "",
      sourceNumber: rec.number ?? "",
    };

    // Numbers are stored zero-padded to 3 (ja:S8b-001), with a rare unpadded
    // promo — try both rather than guessing.
    const candidates = [
      `${LANG}:${rec.dbSetCode}-${rec.number!.padStart(3, "0")}`,
      `${LANG}:${rec.dbSetCode}-${rec.number}`,
    ];
    const externalId = candidates.find((c) => byExternalId.has(c));

    if (!externalId) {
      review.push({ ...base, reason: "no-catalog-row", candidateExternalId: candidates[0] });
      continue;
    }

    const row = byExternalId.get(externalId)!;

    // The name guard — see crawl-pokemon-ja-images.ts. This independently
    // catches a wrong set code, bad number padding, or the page structure
    // drifting. Never loosen it to raise the fill rate.
    let matchedName = rec.nameJa != null && normalizeName(rec.nameJa) === normalizeName(row.name);
    let correctedName: string | undefined;

    if (!matchedName && rec.nameJa) {
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
        matchedName = true; // case A: same species, just a spelling variant — leave catalog name as-is
        matchedViaEnGuard++;
      } else if (pok && !catEn && row.cardType === "Pokémon") {
        // case B: our own name doesn't resolve to anything (strong signal
        // it's corrupted) and pokellector's does — trust pokellector's,
        // corrected name gets a human look before backfill-catalog-name
        // applies it, same verified:false gate as the image file below.
        // Restricted to cardType "Pokémon": the species table is
        // comprehensive, so an unresolved species name really does mean
        // corruption. Trainer/character names are only ever resolved via a
        // deliberately closed curated list (see resolvePossessive's doc
        // comment), so "unresolved" there just means "not curated" — proven
        // unsafe to trust blind: pokellector's own JPN: field for
        // Double-Blaze-Expansion/Kiawe-Card-94 reads "シロナ" (Cynthia) even
        // though the card, by its own URL and English name, is Kiawe — a
        // data error on pokellector's side that this guard would otherwise
        // have "corrected" our (correct) カキ into.
        matchedName = true;
        correctedName = pok.cleaned;
        corrections.push({ externalId, oldName: row.name, newName: pok.cleaned, sourceUrl: base.sourceUrl });
      }
    }

    if (!matchedName) {
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

    entries.push({
      externalId,
      imageSmallUrl: toThumbUrl(rec.imageUrl!),
      imageLargeUrl: rec.imageUrl!,
      sourceUrl: base.sourceUrl,
      sourceName: correctedName ?? rec.nameJa!,
    });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out: CardImageFile = {
    gameId: "pokemon",
    sourceNote:
      "Japanese card images from jp.pokellector.com (a fan card database), crawled offline " +
      "by scripts/crawl-pokemon-jp-pokellector-images.ts. A second JP source alongside " +
      "pokemon-ja.json (pokemon-card.com), used because pokellector's sets are cheap to " +
      "enumerate by set rather than requiring a full id-space sweep. Image URLs are " +
      "hotlinked from the publisher's CDN, never re-hosted. Every entry passed a set-code, " +
      "catalog-row and card-name match against our catalog.",
    verified: false,
    generatedAt: new Date().toISOString(),
    entries,
  };
  fs.writeFileSync(path.join(OUT_DIR, "pokemon-jp-pokellector.json"), JSON.stringify(out, null, 2));

  const reviewOut: CardImageReviewFile = {
    gameId: "pokemon",
    note: "Crawled jp.pokellector.com cards that did NOT pass the mapping guards. Never seeded.",
    generatedAt: new Date().toISOString(),
    entries: review,
  };
  fs.writeFileSync(path.join(OUT_DIR, "pokemon-jp-pokellector.review.json"), JSON.stringify(reviewOut, null, 2));

  fs.writeFileSync(
    path.join(OUT_DIR, "pokemon-jp-pokellector.name-corrections.json"),
    JSON.stringify(
      {
        note:
          "Catalog Set.name/CatalogItem.name corrections proposed from pokellector's JPN: field, for rows " +
          "whose current catalog name did not resolve via resolvePokemonCardNameEn (see derive()'s secondary " +
          "name guard). Not applied automatically — spot-check against sourceUrl, then apply by hand.",
        generatedAt: new Date().toISOString(),
        entries: corrections,
      },
      null,
      2
    )
  );

  const byReason = review.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nMapped:   ${entries.length} (${matchedViaEnGuard} via the secondary EN-name guard)`);
  console.log(`Had art:  ${alreadyHadImage} (already sourced from the provider — untouched)`);
  console.log(`Corrections proposed: ${corrections.length} (pokemon-jp-pokellector.name-corrections.json)`);
  console.log(`Review:   ${review.length}`, byReason);
  console.log(`\nWrote pokemon-jp-pokellector.json (verified: false — review, then flip it).`);
}

async function main() {
  const cmd = process.argv[2];
  const setsArg = process.argv.find((a) => a.startsWith("--sets="));
  const only = setsArg?.slice("--sets=".length).split(",").filter(Boolean);

  if (cmd === "index") await index();
  else if (cmd === "crawl") await crawl(only);
  else if (cmd === "derive") await derive();
  else {
    console.error("Usage: crawl-pokemon-jp-pokellector-images.ts <index|crawl|derive> [--sets=S8b,M6A]");
    process.exit(1);
  }
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
