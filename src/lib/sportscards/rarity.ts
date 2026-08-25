/**
 * Shared rarity/ordering helpers for sports card parallels. A "parallel" is
 * identified by its parallelName + serialLimit (the print run it's numbered
 * to, e.g. "99" or "1" for a 1-of-1 — see the schema comment on
 * SportsCardItem.serialLimit). Used by the detail page's parallels panel and
 * the add-to-collection variant picker so both sort identically.
 */

/**
 * Sortable rarity rank for a single parallel: lower = more common.
 * Non-numeric/blank serialLimit (unnumbered parallels, e.g. plain
 * "Refractor") ranks lowest (least rare). Numeric serialLimit ranks by
 * scarcity — a smaller print run ranks higher (rarer) — with "1" (a true
 * 1-of-1) always ranking highest of all, regardless of magnitude.
 */
export function parallelRarityRank(serialLimit: string | null | undefined): number {
  if (!serialLimit) return 0;
  const n = parseInt(serialLimit.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n === 1) return Number.MAX_SAFE_INTEGER;
  return 1_000_000 - n;
}

/** True when a serialLimit string represents an actual numbered print run. */
export function isNumberedSerialLimit(serialLimit: string | null | undefined): boolean {
  return parallelRarityRank(serialLimit) > 0;
}

/**
 * Orders a list of a card's variants: Base (no parallelName) always first,
 * then every named parallel from least rare to rarest (1-of-1s last).
 */
export function compareParallelsByRarity(
  a: { parallelName: string | null; serialLimit: string | null },
  b: { parallelName: string | null; serialLimit: string | null }
): number {
  const aBase = !a.parallelName;
  const bBase = !b.parallelName;
  if (aBase !== bBase) return aBase ? -1 : 1;
  return parallelRarityRank(a.serialLimit) - parallelRarityRank(b.serialLimit);
}
