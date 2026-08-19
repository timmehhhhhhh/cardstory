export interface HoldingFilters {
  watchlistOnly: boolean;
  gameId: string; // "all" | gameId
  sport: string; // "all" | Sport
  player: string; // free-text, matches sports card playerName
  productType: "all" | "CARD" | "SEALED";
  condition: "all" | "raw" | "graded";
  language: "all" | "EN" | "JP" | "CN" | "TW" | "KR";
  /** Show only holdings whose catalog item is a promotional printing (CatalogItem.rarity === "Promo"). No-op for sports cards, which have no catalogItem. */
  promoOnly: boolean;
}

export const DEFAULT_HOLDING_FILTERS: HoldingFilters = {
  watchlistOnly: false,
  gameId: "all",
  sport: "all",
  player: "",
  productType: "all",
  condition: "all",
  language: "all",
  promoOnly: false,
};
