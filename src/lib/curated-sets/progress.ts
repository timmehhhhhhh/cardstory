import { getGameMeta } from "@/lib/games/registry";
import { holdingIsArchived, type PC } from "@/lib/pc/types";
import type { CatalogSearchItem } from "@/lib/catalog/search";

export interface CuratedSetProgress {
  owned: CatalogSearchItem[];
  missing: CatalogSearchItem[];
  total: number;
  completed: number;
  pct: number;
}

/**
 * How many copies of `item` the user owns, summed across every one of their
 * PCs (not just an "active" one) and ignoring archived holdings — the exact
 * same rule CardTile's `ownedQuantity` uses (src/components/cards/
 * card-tile.tsx), reused here so a curated set's "owned" count can never
 * drift from what the rest of the app already shows as owned.
 */
function ownedQuantityFor(item: CatalogSearchItem, pcs: PC[]): number {
  const isSports = getGameMeta(item.gameId)?.kind === "sports";
  return pcs.reduce(
    (total, pc) =>
      total +
      pc.holdings.reduce((sum, h) => {
        if (holdingIsArchived(h)) return sum;
        const matches = isSports ? h.sportsCardItemId === item.id : h.catalogItemId === item.id;
        return matches ? sum + h.quantity : sum;
      }, 0),
    0
  );
}

/**
 * Splits a curated set's matches into owned (>= targetQuantity copies) and
 * still-missing, and computes the "112 / 120 (93%)" progress figures shown
 * on the list and detail pages.
 */
export function computeCuratedSetProgress(
  matches: CatalogSearchItem[],
  pcs: PC[],
  targetQuantity: number
): CuratedSetProgress {
  const owned: CatalogSearchItem[] = [];
  const missing: CatalogSearchItem[] = [];
  for (const item of matches) {
    if (ownedQuantityFor(item, pcs) >= targetQuantity) owned.push(item);
    else missing.push(item);
  }
  const total = matches.length;
  const completed = owned.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { owned, missing, total, completed, pct };
}
