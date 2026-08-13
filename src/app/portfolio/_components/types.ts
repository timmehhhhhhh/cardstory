export interface HoldingFilters {
  watchlistOnly: boolean;
  gameId: string; // "all" | gameId
  productType: "all" | "CARD" | "SEALED";
  condition: "all" | "raw" | "graded";
  language: "all" | "EN" | "JP" | "CN";
}

export const DEFAULT_HOLDING_FILTERS: HoldingFilters = {
  watchlistOnly: false,
  gameId: "all",
  productType: "all",
  condition: "all",
  language: "all",
};
