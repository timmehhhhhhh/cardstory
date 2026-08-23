import type { Holding } from "@/lib/pc/types";
import { holdingKind } from "@/lib/pc/types";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";
import type { DeckCard } from "@/lib/deck-crafting/types";
import type { ValidatableCard } from "@/lib/deck-crafting/validate";

/**
 * Total owned quantity per CatalogItem.id, summed across every PC the user
 * has (not just the "active" one) — a card counts as owned regardless of
 * which of the user's PCs it's filed under. This is what powers the "Not
 * Owned" watermark: computed at read time from live holdings, never stored
 * on a DeckCard, so it can never go stale as holdings change after a card
 * was added to a deck (see the doc comment on the DeckCard Prisma model).
 */
export function computeOwnedQuantities(allHoldings: Holding[]): Map<string, number> {
  const owned = new Map<string, number>();
  for (const h of allHoldings) {
    if (holdingKind(h) !== "tcg" || !h.catalogItemId) continue;
    owned.set(h.catalogItemId, (owned.get(h.catalogItemId) ?? 0) + h.quantity);
  }
  return owned;
}

/** Whether the user owns at least `quantity` copies of `catalogItemId`, per computeOwnedQuantities. */
export function isDeckCardOwned(
  catalogItemId: string,
  quantity: number,
  ownedQuantities: Map<string, number>
): boolean {
  return (ownedQuantities.get(catalogItemId) ?? 0) >= quantity;
}

/** Joins a deck's raw DeckCard rows against fetched catalog details, for validateDeck() and the deck editor UI. */
export function enrichDeckCards(
  cards: DeckCard[],
  catalogItemsById: Map<string, CatalogItemDetail>
): (ValidatableCard & { catalogItem: CatalogItemDetail | undefined })[] {
  return cards.map((c) => {
    const item = catalogItemsById.get(c.catalogItemId);
    return {
      section: c.section,
      catalogItemId: c.catalogItemId,
      name: item?.name ?? c.catalogItemId,
      cardType: item?.cardType ?? null,
      quantity: c.quantity,
      catalogItem: item,
    };
  });
}
