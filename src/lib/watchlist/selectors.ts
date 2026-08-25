import { buildDisplay, type DisplayInfo } from "@/lib/pc/selectors";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";
import type { SportsCardItemDetail } from "@/lib/sportscards/manage";
import type { WatchlistItem } from "@/lib/pc/types";

/**
 * A watchlist entry enriched with live catalog data — the watchlist's
 * counterpart to EnrichedShortlistItem (src/lib/shortlist/selectors.ts).
 * WatchlistItem only stores itemId/kind/addedAt/priceAtAdd (see
 * src/lib/pc/types.ts), so every other display field is looked up here
 * from the catalog/sports card the itemId points at, same as PC holdings
 * and shortlist rows.
 */
export interface EnrichedWatchlistItem extends WatchlistItem {
  catalogItem: CatalogItemDetail | undefined;
  sportsCardItem: SportsCardItemDetail | undefined;
  display: DisplayInfo;
  /** Live market price in USD — null for an untracked/unpriced card. */
  marketPrice: number | null;
  /** marketPrice - priceAtAdd, when both are known. */
  priceChangeSinceAdd: number | null;
}

export function enrichWatchlist(
  items: WatchlistItem[],
  catalogItems: CatalogItemDetail[],
  sportsCardItems: SportsCardItemDetail[]
): EnrichedWatchlistItem[] {
  const catalogById = new Map(catalogItems.map((c) => [c.id, c]));
  const sportsById = new Map(sportsCardItems.map((c) => [c.id, c]));

  return items.map((item) => {
    const catalogItem = item.kind === "tcg" ? catalogById.get(item.itemId) : undefined;
    const sportsCardItem = item.kind === "sports" ? sportsById.get(item.itemId) : undefined;
    const marketPrice = (item.kind === "sports" ? sportsCardItem?.priceRaw : catalogItem?.priceRaw) ?? null;

    return {
      ...item,
      catalogItem,
      sportsCardItem,
      display: buildDisplay(
        { kind: item.kind, sportsCardItemId: item.kind === "sports" ? item.itemId : undefined },
        catalogItem,
        sportsCardItem
      ),
      marketPrice,
      priceChangeSinceAdd: marketPrice != null && item.priceAtAdd != null ? marketPrice - item.priceAtAdd : null,
    };
  });
}
