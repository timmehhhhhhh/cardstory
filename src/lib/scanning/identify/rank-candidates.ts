/**
 * Generalizes src/lib/scan/match.ts's Fuse-based candidate matching to run
 * over `CatalogSearchItem[]` (from src/lib/catalog/search.ts's
 * `searchCatalog`) instead of a raw `db.catalogItem.findMany` — this is
 * the mechanism by which the scanning engine reuses the existing catalog
 * search path rather than re-querying Prisma ad hoc per detected card, and
 * rather than forking src/lib/scan/match.ts (left untouched; the existing
 * single-card `/api/scan/identify` route keeps using it as-is).
 */
import Fuse, { type IFuseOptions } from "fuse.js";
import { searchCatalog, type CatalogSearchItem } from "@/lib/catalog/search";
import { nameSearchVariants } from "@/lib/utils/name-match";
import type { CandidateMatch } from "../types";

export interface RankCandidatesInput {
  cardName: string;
  cardNumber?: string | null;
  /** The set name or set symbol text Claude read off the card, if any — see setNameBoost below. */
  setNameOrSymbol?: string | null;
  gameId?: string | null;
  limit?: number;
}

const DEFAULT_LIMIT = 5;
// Same name-similarity weighting/threshold as src/lib/scan/match.ts's Fuse
// config (name-dominant, 0.45 threshold) so name-fuzziness behavior doesn't
// silently diverge between the single-card manual Scan feature and this
// engine. Unlike match.ts, `number` isn't folded into the same fuzzy-string
// search here — a short collector number ("025/102") barely moves a
// combined-string Fuse score either way, so it's applied afterward as an
// explicit ranking boost instead (see NUMBER_EXACT_MATCH_BOOST below), which
// is what actually makes "set/card-number relationships" a real ranking
// signal per the layered identification strategy this module implements.
const FUSE_OPTIONS: IFuseOptions<CatalogSearchItem> = {
  keys: [{ name: "name", weight: 1 }],
  threshold: 0.45,
  includeScore: true,
};

/** Added to a candidate's name-similarity score when its printed number exactly matches the queried number. */
const NUMBER_EXACT_MATCH_BOOST = 0.15;
/** Added when the candidate's number contains the queried number as a substring (e.g. OCR dropped a leading zero) but isn't an exact match. */
const NUMBER_PARTIAL_MATCH_BOOST = 0.05;
/**
 * Added when the candidate's set name matches the set name/symbol Claude
 * read off the card. Weighted below the number boosts — printed set text is
 * noisier OCR than a short collector number — but this is the one signal
 * this ranker has to disambiguate "same name, different set" (e.g. a
 * Pikachu reprinted across many sets) and "similar artwork" cases, which
 * name+number fuzzy matching alone can't tell apart.
 */
const SET_NAME_EXACT_MATCH_BOOST = 0.1;
const SET_NAME_PARTIAL_MATCH_BOOST = 0.03;

function numberBoost(itemNumber: string | null, queriedNumber: string | null | undefined): number {
  if (!itemNumber || !queriedNumber) return 0;
  if (itemNumber === queriedNumber) return NUMBER_EXACT_MATCH_BOOST;
  if (itemNumber.includes(queriedNumber) || queriedNumber.includes(itemNumber)) {
    return NUMBER_PARTIAL_MATCH_BOOST;
  }
  return 0;
}

/** Lowercased, alphanumeric-only — tolerant of "Base Set" vs "base-set" vs a set symbol's OCR'd text. */
function normalizeSetText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function setNameBoost(itemSetName: string | null, queriedSetNameOrSymbol: string | null | undefined): number {
  if (!itemSetName || !queriedSetNameOrSymbol) return 0;
  const item = normalizeSetText(itemSetName);
  const queried = normalizeSetText(queriedSetNameOrSymbol);
  if (!item || !queried) return 0;
  if (item === queried) return SET_NAME_EXACT_MATCH_BOOST;
  if (item.includes(queried) || queried.includes(item)) return SET_NAME_PARTIAL_MATCH_BOOST;
  return 0;
}

function toCandidateMatch(
  item: CatalogSearchItem,
  fuseScore: number | undefined,
  queriedNumber: string | null | undefined,
  queriedSetNameOrSymbol: string | null | undefined
): CandidateMatch {
  // Fuse scores are 0 (perfect match) to 1 (worst); CandidateMatch.score is
  // the opposite convention (1 = best), so it reads naturally as "how good
  // is this match" for both display and confidence-scoring purposes.
  const nameScore = fuseScore == null ? 1 : Math.max(0, Math.min(1, 1 - fuseScore));
  const score = Math.max(
    0,
    Math.min(
      1,
      nameScore + numberBoost(item.number, queriedNumber) + setNameBoost(item.setName, queriedSetNameOrSymbol)
    )
  );
  return {
    catalogItemId: item.id,
    gameId: item.gameId,
    name: item.name,
    setName: item.setName,
    number: item.number,
    imageSmallUrl: item.imageSmallUrl,
    score,
  };
}

/**
 * The pure, DB-free ranking half: re-scores an already-fetched pool of
 * catalog items against a name/number query. Exported separately so tests
 * feed it a fixed `CatalogSearchItem[]` and assert ranking/scoring without
 * mocking `searchCatalog`. Dedupes by `id` (defensive — a caller-supplied
 * pool could in principle contain the same item twice).
 */
export function rankCatalogItems(
  pool: CatalogSearchItem[],
  query: { cardName: string; cardNumber?: string | null; setNameOrSymbol?: string | null },
  limit = DEFAULT_LIMIT
): CandidateMatch[] {
  const deduped = new Map<string, CatalogSearchItem>();
  for (const item of pool) {
    if (!deduped.has(item.id)) deduped.set(item.id, item);
  }

  const fuse = new Fuse([...deduped.values()], FUSE_OPTIONS);

  return fuse
    .search(query.cardName)
    .map((result) => toCandidateMatch(result.item, result.score, query.cardNumber, query.setNameOrSymbol))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Runs `nameSearchVariants(cardName)` through `searchCatalog({q, gameId})`
 * to gather a candidate pool from the shared catalog search path, then
 * re-scores that pool with `rankCatalogItems` to produce a final ranked
 * `CandidateMatch[]`.
 */
export async function rankCandidates(input: RankCandidatesInput): Promise<CandidateMatch[]> {
  const { cardName, cardNumber, setNameOrSymbol, gameId, limit = DEFAULT_LIMIT } = input;
  if (!cardName.trim()) return [];

  const variants = nameSearchVariants(cardName);
  const pool = new Map<string, CatalogSearchItem>();

  for (const q of variants) {
    const { items } = await searchCatalog({
      q,
      gameId: gameId ?? undefined,
      pageSize: 60,
    });
    for (const item of items) {
      if (!pool.has(item.id)) pool.set(item.id, item);
    }
  }

  return rankCatalogItems([...pool.values()], { cardName, cardNumber, setNameOrSymbol }, limit);
}
