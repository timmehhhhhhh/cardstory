import { RIFTBOUND_DOMAIN_ORDER } from "@/lib/games/riftbound/domain";

/**
 * Comparators shared between Explore's server-side search ordering
 * (src/lib/catalog/search.ts) and Watchlist's client-side sort
 * (src/lib/watchlist/selectors.ts) — extracted so both apply the exact same
 * "what does 'newest first'/'by card number'/etc. mean" rules instead of
 * each maintaining its own copy that could quietly drift apart.
 */

export function compareNullsLast(x: number | null, y: number | null, ascending: boolean): number {
  if (x == null && y == null) return 0;
  if (x == null) return 1;
  if (y == null) return -1;
  return ascending ? x - y : y - x;
}

/** Same nulls-last shape as compareNullsLast, for ISO "YYYY-MM-DD" strings (lexicographic == chronological). */
export function compareNullsLastStr(x: string | null, y: string | null, ascending: boolean): number {
  if (x == null && y == null) return 0;
  if (x == null) return 1;
  if (y == null) return -1;
  return ascending ? x.localeCompare(y) : y.localeCompare(x);
}

/**
 * Natural, numeric-aware comparison for card numbers, nulls last. Plain
 * lexicographic order breaks on the un-padded numbers several games use
 * (Riftbound's "10" sorts before "2"; a sports "cardNumber" like "1-GG" vs
 * "10"), so this leans on Intl's numeric collation instead — it treats
 * embedded digit runs as numbers while still comparing letters normally,
 * which handles zero-padded Pokémon numbers ("025/198"), plain digits
 * (Riftbound), and alpha-prefixed ones (FAB's "BOL024") correctly.
 */
export function compareCardNumbers(a: string | null, b: string | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Ranks by each row's first domain against RIFTBOUND_DOMAIN_ORDER (a dual-
 * domain Legend's second domain doesn't affect its sort position — only
 * which group it groups into). Rows with no domain (every non-Riftbound
 * game) sort last, same nulls-last convention as compareCardNumbers.
 */
export function compareDomains(a: string[], b: string[]): number {
  const [da, db_] = [a[0], b[0]];
  if (da == null && db_ == null) return 0;
  if (da == null) return 1;
  if (db_ == null) return -1;
  const ai = RIFTBOUND_DOMAIN_ORDER.indexOf(da);
  const bi = RIFTBOUND_DOMAIN_ORDER.indexOf(db_);
  if (ai === -1 && bi === -1) return da.localeCompare(db_);
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}
