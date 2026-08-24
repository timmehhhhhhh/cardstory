"use client";

import { usePCStore } from "@/lib/pc/store";
import { useShortlistStore } from "@/lib/shortlist/store";
import type { HoldingKind } from "@/lib/pc/types";

/**
 * One-click "add to shortlist" for a card already identified (a catalog
 * search result, or an existing holding) — the card-tile equivalent of
 * ShortlistAddBar.addFromCatalog, minus the search UI. Centralised here
 * rather than repeated in CardTile/ItemGallery/ItemGrid so the
 * askingPrice/askingCurrency defaulting stays in one place.
 */
export function useAddToShortlist() {
  const lastUsedCostBasisCurrency = usePCStore((s) => s.preferences.lastUsedCostBasisCurrency);
  const addShortlistItem = useShortlistStore((s) => s.addShortlistItem);

  return function addToShortlist(args: {
    kind: HoldingKind;
    catalogItemId?: string;
    sportsCardItemId?: string;
    /** Where this add is coming from — "Explore", "PC · {pcName}", "Business Inventory". */
    source: string;
  }) {
    return addShortlistItem({
      kind: args.kind,
      catalogItemId: args.kind === "tcg" ? args.catalogItemId : undefined,
      sportsCardItemId: args.kind === "sports" ? args.sportsCardItemId : undefined,
      quantity: 1,
      // Deliberately 0, not a market price — see ShortlistAddBar.addFromCatalog
      // for why: this field is what a shop charges, not what the card is worth.
      askingPrice: 0,
      askingCurrency: lastUsedCostBasisCurrency ?? "USD",
      source: args.source,
    });
  };
}

/**
 * Total quantity across every shortlist row matching this catalog/sports
 * card — drives the quantity badge on the shortlist button, the same way
 * ownedQuantity in card-tile.tsx drives the "Add to collection" badge.
 * Repeat adds create separate rows (see useAddToShortlist above), so this
 * sums `quantity` across all of them rather than just checking existence.
 * Deliberately ignores kind "custom" rows (a custom row has no
 * catalogItemId or sportsCardItemId to match against, same as ownedQuantity
 * in card-tile.tsx).
 */
export function useShortlistQuantity(catalogItemId?: string, sportsCardItemId?: string) {
  return useShortlistStore((s) =>
    s.items.reduce((sum, i) => {
      const matches =
        (catalogItemId != null && i.catalogItemId === catalogItemId) ||
        (sportsCardItemId != null && i.sportsCardItemId === sportsCardItemId);
      return matches ? sum + i.quantity : sum;
    }, 0)
  );
}
