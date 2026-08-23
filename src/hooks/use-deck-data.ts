"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useDeckCraftingStore } from "@/lib/deck-crafting/store";
import { usePCStore } from "@/lib/pc/store";
import { computeOwnedQuantities, enrichDeckCards } from "@/lib/deck-crafting/selectors";
import { validateDeck } from "@/lib/deck-crafting/validate";
import { getFormat } from "@/lib/deck-crafting/formats";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";
import type { Deck } from "@/lib/deck-crafting/types";

const EMPTY_DECK_LIST: Deck[] = [];

/** One deck's cards enriched with live catalog data, ownership, and format validation — the deck editor's single data source. */
export function useDeckData(deckId: string) {
  const decks = useDeckCraftingStore((s) => s.decks);
  const deck = decks.find((d) => d.id === deckId);
  const format = deck ? getFormat(deck.formatId) : undefined;

  const catalogIds = React.useMemo(
    () => Array.from(new Set((deck?.cards ?? []).map((c) => c.catalogItemId))),
    [deck?.cards]
  );

  const catalogQuery = useQuery<{ items: CatalogItemDetail[] }>({
    queryKey: ["catalog-by-ids", catalogIds],
    queryFn: async () => {
      if (catalogIds.length === 0) return { items: [] };
      const res = await fetch(`/api/catalog/by-ids?ids=${catalogIds.join(",")}`);
      if (!res.ok) throw new Error("Failed to load catalog items");
      return res.json();
    },
  });

  const catalogItemsById = React.useMemo(() => {
    const map = new Map<string, CatalogItemDetail>();
    for (const item of catalogQuery.data?.items ?? []) map.set(item.id, item);
    return map;
  }, [catalogQuery.data]);

  // Ownership needs every PC's holdings, not just the "active" one — see
  // computeOwnedQuantities's doc comment.
  const pcs = usePCStore((s) => s.pcs);
  const allHoldings = React.useMemo(() => pcs.flatMap((p) => p.holdings), [pcs]);
  const ownedQuantities = React.useMemo(() => computeOwnedQuantities(allHoldings), [allHoldings]);

  const enrichedCards = React.useMemo(
    () => enrichDeckCards(deck?.cards ?? [], catalogItemsById),
    [deck?.cards, catalogItemsById]
  );

  const validation = React.useMemo(
    () => (format ? validateDeck(enrichedCards, format) : undefined),
    [enrichedCards, format]
  );

  return {
    deck,
    format,
    enrichedCards,
    catalogItemsById,
    ownedQuantities,
    validation,
    isLoading: catalogQuery.isLoading && catalogIds.length > 0,
  };
}

/** All of the user's decks, in their chosen order. */
export function useDeckList() {
  return useDeckCraftingStore((s) => s.decks) ?? EMPTY_DECK_LIST;
}
