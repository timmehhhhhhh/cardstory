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
  /**
   * Filters on the holding's immutable `createdAt` (when it was added to
   * CardStory) — a static, server-set field with no UI to edit it.
   * Deliberately distinct from Date Acquired (`acquiredAt`), which is a
   * user-editable, optional physical-acquisition date. "" | "YYYY-MM-DD".
   */
  dateAddedFrom: string;
  dateAddedTo: string;
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
  dateAddedFrom: "",
  dateAddedTo: "",
};
