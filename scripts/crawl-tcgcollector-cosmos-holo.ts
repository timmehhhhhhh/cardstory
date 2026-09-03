/**
 * One-off import of TCGCollector's "Cosmos Holo" card-variant tag
 * (https://www.tcgcollector.com/cards/intl?cardVariantTypes=48) into our
 * catalog as a distinct Pokémon `CatalogItem.variantKey` ("cosmosHolo"),
 * separate from the generic "reverseHolofoil" bucket every card in that
 * finish otherwise falls into (see lib/games/pokemon/mapper.ts).
 *
 * Scope, deliberately narrow: TCGCollector's own per-card tagging for this
 * variant is a work in progress (687 cards today, against our ~9,400
 * `reverseHolofoil` rows, and only a subset within any one set) — this
 * imports exactly what TCGCollector currently lists, nothing inferred or
 * extrapolated. Re-run later to pick up more as TCGCollector's own coverage
 * grows.
 *
 * Matching is done by SET NAME (TCGCollector's printed set name on each card
 * row, matched against our own Set.name), not by TCGCollector's 3-4 letter
 * set code — the crawl already carries the set name for free on every row,
 * so there's no need for a hand-maintained code table that could silently
 * drift wrong. A small alias list below covers the handful of genuine
 * punctuation/wording differences (e.g. sub-set naming). Any TCGCollector
 * set name that still doesn't resolve is reported for manual review, never
 * guessed at.
 *
 *   npx tsx scripts/crawl-tcgcollector-cosmos-holo.ts parse
 *   npx tsx scripts/crawl-tcgcollector-cosmos-holo.ts derive
 *
 * NOTE on `parse` vs. the usual fetch-based crawl: tcgcollector.com 403s a
 * plain script fetch (Cloudflare-style bot gate) even with a truthful,
 * low-frequency User-Agent — and getting around that would mean spoofing a
 * browser fingerprint, which this repo's crawlers deliberately don't do (see
 * polite-fetch.ts's USER_AGENT comment). Normal interactive browsing is not
 * blocked, so the source data here was captured that way instead: the site's
 * own list view (?displayAs=list&cardVariantTypes=48), 120 rows/page, 6
 * pages, saved verbatim as scripts/.cache/tcgcollector-page{1..6}.txt. `parse`
 * turns those into the same CrawlRecord cache shape a fetch-based crawl would
 * have produced, so `derive` below doesn't care which path populated it.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "@/lib/db";
import { openCrawlCache, type CrawlRecord } from "./lib/crawl-cache";
import { runScript, usage, verb } from "./lib/cli";
import { dataDir, tallyByReason, writeMappingFile, writeReviewFile } from "./lib/source-output";

const SOURCE_URL = "https://www.tcgcollector.com/cards/intl?releaseDateOrder=newToOld&cardVariantTypes=48";
const CACHE_NAME = "pokemon-tcgcollector-cosmos-holo";
const CACHE_DIR = path.join(process.cwd(), "scripts", ".cache");
const OUT_DIR = dataDir();
const MATCHES_NAME = "pokemon-cosmos-holo-matches.json";
const REVIEW_NAME = "pokemon-cosmos-holo-matches.review.json";

interface CosmosHoloFields {
  name: string | null;
  setName: string | null;
  /** As printed, e.g. "026/182", "DP03", "No. 001". */
  number: string | null;
}
// A plain intersection, not `interface X extends CrawlRecord`: CrawlRecord's
// `[key: string]: unknown` index signature collapses `keyof` on anything
// derived from it, which breaks `Omit<X, "id" | "status">` (TS silently
// drops the named fields). Keeping CosmosHoloFields as its own standalone
// type instead sidesteps that entirely.
type CosmosHoloRecord = CrawlRecord & CosmosHoloFields;

/**
 * Each captured page is a flat repeating block of lines:
 *   0                (collection-count placeholder button, ignored)
 *   <card name>
 *   <set name>
 *   <set code>
 *   <card number>
 *   $<price>
 * A handful of rows (the "Yellow A Alternate" pseudo-set) omit the set-code
 * line, merging code+number into one token — detected by that line not
 * starting with "$" on the *next* line, and handled by treating the 4th line
 * as the number with no separate code (code isn't used for matching anyway).
 */
function parsePageFile(text: string): CosmosHoloFields[] {
  const lines = text.split("\n").map((l) => l.trim());
  const out: CosmosHoloFields[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i] === "") {
      i++;
      continue;
    }
    if (lines[i] !== "0") {
      i++; // stray line, skip defensively
      continue;
    }
    const name = lines[i + 1] ?? null;
    const setName = lines[i + 2] ?? null;
    const l3 = lines[i + 3] ?? "";
    const l4 = lines[i + 4] ?? "";
    if (l4.startsWith("$")) {
      // Irregular row (no separate set-code line): 0 / name / setName / number+code / $price
      out.push({ name, setName, number: l3 || null });
      i += 5;
    } else {
      // Normal 6-line row: 0 / name / setName / code / number / $price
      out.push({ name, setName, number: l4 || null });
      i += 6;
    }
  }
  return out;
}

async function parse() {
  const cache = openCrawlCache<CosmosHoloRecord>(CACHE_NAME);
  let nextId = 1;
  let total = 0;
  for (let page = 1; ; page++) {
    const file = path.join(CACHE_DIR, `tcgcollector-page${page}.txt`);
    if (!fs.existsSync(file)) break;
    const rows = parsePageFile(fs.readFileSync(file, "utf-8"));
    for (const row of rows) {
      cache.append({ id: nextId++, status: 200, ...row });
    }
    console.log(`page ${page}: ${rows.length} rows`);
    total += rows.length;
  }
  cache.close();
  console.log(`\nParsed ${total} rows into the cache.`);
}

/**
 * NFKC + strip whitespace/punctuation.
 *
 * Deliberately local rather than one of lib/normalize.ts's exports: this one
 * also strips "&" and collapses runs of whitespace, which the CJK normalizer
 * does not. TCGCollector prints English card names where "&" spacing varies
 * ("Team Magma & Team Aqua"), so the difference is load-bearing here and
 * folding it into the shared normalizer would change what the CJK crawlers
 * consider equal.
 */
function normalizeName(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[·・.,'’"“”\-—–~〜!?！？:：;；()（）「」『』【】[\]&]/g, "")
    .toLowerCase();
}

/**
 * TCGCollector set-name spellings that don't literally equal our Set.name —
 * genuine wording/punctuation differences, hand-verified against the DB, not
 * guesses. Keys/values are RAW (human-readable) strings, run through
 * normalizeName() below before use, so this table stays legible rather than
 * a wall of already-mangled tokens. Anything not listed here must match our
 * Set.name exactly (after normalizeName) or gets reported for review.
 */
const RAW_SET_NAME_ALIASES: Record<string, string> = {
  "Crown Zenith (Galarian Gallery)": "Crown Zenith Galarian Gallery",
  "Silver Tempest (Trainer Gallery)": "Silver Tempest Trainer Gallery",
  "Astral Radiance (Trainer Gallery)": "Astral Radiance Trainer Gallery",
  "Brilliant Stars (Trainer Gallery)": "Brilliant Stars Trainer Gallery",
  "Lost Origin (Trainer Gallery)": "Lost Origin Trainer Gallery",
  "Hidden fates (Shiny Vault)": "Hidden Fates Shiny Vault",
  "Shining Fates (Shiny Vault)": "Shining Fates Shiny Vault",
  "Celebrations (Classic Collection)": "Celebrations: Classic Collection",
  // TCGCollector's "<Series> Promos" vs. our "<CODE> Black Star Promos" /
  // differently-worded promo-set names — verified 1:1 against the DB's
  // English set list.
  "Scarlet & Violet Promos": "Scarlet & Violet Black Star Promos",
  "Sword & Shield Promos": "SWSH Black Star Promos",
  "Sun & Moon Promos": "SM Black Star Promos",
  "XY Promos": "XY Black Star Promos",
  "Black & White Promos": "BW Black Star Promos",
  "HeartGold & SoulSilver Promos": "HGSS Black Star Promos",
  "Diamond & Pearl Promos": "DP Black Star Promos",
  "Nintendo Promos": "Nintendo Black Star Promos",
  "Wizards of the Coast Promos": "Wizards Black Star Promos",
  "Base Set": "Base",
  "Unleashed": "HS—Unleashed",
  "Undaunted": "HS—Undaunted",
  "Triumphant": "HS—Triumphant",
  "Scarlet & Violet 151": "151",
};
const SET_NAME_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(RAW_SET_NAME_ALIASES).map(([k, v]) => [normalizeName(k), normalizeName(v)])
);

/** TCGCollector prints early EX-era sets as "EX <Name>"; our Set.name drops
 *  that prefix (e.g. "EX Crystal Guardians" -> "Crystal Guardians"). Generic
 *  rather than a per-set alias since the prefix is applied consistently. */
function stripExPrefix(normalized: string): string | null {
  return normalized.startsWith("ex") ? normalized.slice(2) : null;
}

/** "026/182" -> "26"; "DP03" -> "DP03"; "No. 001" -> "1". */
function normalizeNumber(raw: string): string {
  const slash = /^0*(\d+)\/\d+$/.exec(raw);
  if (slash) return slash[1];
  const noDot = /^No\.\s*0*(\d+)$/.exec(raw);
  if (noDot) return noDot[1];
  return raw;
}

interface MatchEntry {
  catalogItemId: string;
  sourceName: string;
  sourceSet: string;
  sourceNumber: string;
}
interface ReviewEntry {
  reason: "unknown-set-name" | "no-catalog-row" | "name-mismatch" | "missing-page-fields";
  sourceName: string | null;
  sourceSet: string | null;
  sourceNumber: string | null;
  detail?: string;
}

async function derive() {
  const cache = openCrawlCache<CosmosHoloRecord>(CACHE_NAME);
  const all = cache.all();
  cache.close();

  const parseable = all.filter((r) => r.name && r.setName && r.number);
  const unparseable = all.filter((r) => !(r.name && r.setName && r.number));
  console.log(`Crawled: ${all.length} (${parseable.length} parseable, ${unparseable.length} not)`);

  const sets = await db.set.findMany({
    where: { gameId: "pokemon", NOT: { id: { contains: ":ja:" } } },
    select: { id: true, name: true },
  });
  // English/international sets only (pokemontcg.io-sourced ids have no
  // language prefix in Set.id, unlike ja:/zh-cn:/zh-tw:/ko: ones).
  const bySetName = new Map(
    sets.filter((s) => !/^pokemon:(ja|zh-cn|zh-tw|ko):/.test(s.id)).map((s) => [normalizeName(s.name), s.id])
  );

  const items = await db.catalogItem.findMany({
    where: { gameId: "pokemon", language: "EN", variantKey: "reverseHolofoil" },
    select: { id: true, setId: true, number: true, name: true },
  });
  const byKey = new Map(items.map((i) => [`${i.setId}::${i.number}`, i]));

  const matches: MatchEntry[] = [];
  const review: ReviewEntry[] = unparseable.map((r) => ({
    reason: "missing-page-fields",
    sourceName: r.name,
    sourceSet: r.setName,
    sourceNumber: r.number,
  }));

  for (const r of parseable) {
    const base = {
      sourceName: r.name,
      sourceSet: r.setName,
      sourceNumber: r.number,
    };
    const normSet = normalizeName(r.setName!);
    const aliased = SET_NAME_ALIASES[normSet];
    const stripped = stripExPrefix(normSet);
    const setId = bySetName.get(aliased ?? normSet) ?? (stripped ? bySetName.get(stripped) : undefined);
    if (!setId) {
      review.push({ ...base, reason: "unknown-set-name" });
      continue;
    }

    const number = normalizeNumber(r.number!);
    const row = byKey.get(`${setId}::${number}`);
    if (!row) {
      review.push({ ...base, reason: "no-catalog-row", detail: `${setId}::${number}` });
      continue;
    }

    if (normalizeName(row.name) !== normalizeName(r.name!)) {
      review.push({ ...base, reason: "name-mismatch", detail: `catalog name: ${row.name}` });
      continue;
    }

    matches.push({ catalogItemId: row.id, sourceName: r.name!, sourceSet: r.setName!, sourceNumber: r.number! });
  }

  writeMappingFile(OUT_DIR, MATCHES_NAME, {
    gameId: "pokemon",
    sourceNote:
      `Cards TCGCollector tags with the 'Cosmos Holo' card variant (${SOURCE_URL}), captured by ` +
      "scripts/crawl-tcgcollector-cosmos-holo.ts and matched to existing reverseHolofoil " +
      "CatalogItem rows by set name + card number + name guard. Applying this file " +
      "(scripts/apply-cosmos-holo-variant.ts) only changes each matched row's variantKey to " +
      "'cosmosHolo' — never its id — so it's a permanent, reseed-safe change.",
    entries: matches,
  });
  writeReviewFile(OUT_DIR, REVIEW_NAME, {
    note: "Crawled TCGCollector 'Cosmos Holo' cards that did NOT map to an existing reverseHolofoil CatalogItem row. Never applied.",
    entries: review,
  });

  console.log(`\nMatched: ${matches.length}`);
  console.log(`Review:  ${review.length}`, tallyByReason(review));
  console.log(`\nWrote ${MATCHES_NAME} (verified: false — review, then flip it).`);
  console.log(`Wrote ${REVIEW_NAME}.`);
}

async function main() {
  const cmd = verb();
  if (cmd === "parse") await parse();
  else if (cmd === "derive") await derive();
  else usage("Usage: crawl-tcgcollector-cosmos-holo.ts <parse|derive>");
}

void runScript(main, () => db.$disconnect());
