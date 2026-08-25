export const APP_NAME = "CardStory";

export const NAV_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/sets", label: "Sets" },
  { href: "/pc", label: "PC" },
  { href: "/shortlist", label: "Shortlist" },
  { href: "/binder", label: "Binder Planner" },
  { href: "/deck-crafting", label: "Deck Crafting" },
  { href: "/business", label: "Business", vendorOnly: true },
  { href: "/views", label: "Views" },
  { href: "/trade-analyzer", label: "Trade Analyzer" },
] as const;

export const SUPPORTED_CURRENCIES = ["USD", "CAD", "EUR", "GBP", "JPY", "AUD", "NZD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Static, cached FX rates relative to USD. Refresh manually; no live FX API wired in v1. */
export const FX_RATES_TO_USD: Record<SupportedCurrency, number> = {
  USD: 1,
  CAD: 1.38,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  AUD: 1.53,
  NZD: 1.66,
};

export const PRICE_HISTORY_RANGES = ["1M", "3M", "6M", "1Y"] as const;
export type PriceHistoryRange = (typeof PRICE_HISTORY_RANGES)[number];

export const PC_CHART_RANGES = ["1D", "7D", "1M", "3M", "6M", "MAX"] as const;
export type PCChartRange = (typeof PC_CHART_RANGES)[number];

/** Physical grading scale for a "raw" (ungraded) holding, best to worst. */
export const CARD_CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;
export type RawCardCondition = (typeof CARD_CONDITIONS)[number];

export const CARD_CONDITION_LABELS: Record<RawCardCondition, string> = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
};

/** How an archived card left the collection — see Holding.letGoMethod / PC Archives. */
export const LET_GO_METHODS = ["sold", "traded", "gifted", "lost", "other"] as const;
export type LetGoMethod = (typeof LET_GO_METHODS)[number];

export const LET_GO_METHOD_LABELS: Record<LetGoMethod, string> = {
  sold: "Sold",
  traded: "Traded",
  gifted: "Gifted",
  lost: "Lost / Missing",
  other: "Other",
};

/** How a card came into the collection — see Holding.acquisitionMethod. */
export const ACQUISITION_METHODS = ["bought", "traded", "gifted", "pack", "other"] as const;
export type AcquisitionMethod = (typeof ACQUISITION_METHODS)[number];

export const ACQUISITION_METHOD_LABELS: Record<AcquisitionMethod, string> = {
  bought: "Bought",
  traded: "Trade",
  gifted: "Gifted",
  pack: "Pulled from pack",
  other: "Other",
};
