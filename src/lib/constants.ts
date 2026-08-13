export const APP_NAME = "CardStory";

export const NAV_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/sets", label: "Sets" },
  { href: "/portfolio", label: "Portfolio" },
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

export const PORTFOLIO_CHART_RANGES = ["1D", "7D", "1M", "3M", "6M", "MAX"] as const;
export type PortfolioChartRange = (typeof PORTFOLIO_CHART_RANGES)[number];
