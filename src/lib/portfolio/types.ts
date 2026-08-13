import type { SupportedCurrency } from "@/lib/constants";

export type CardCondition = "raw" | "graded";
export type ItemLanguage = "EN" | "JP" | "CN";
export type ViewMode = "grid" | "list";

/**
 * A single owned line-item in a local portfolio. `catalogItemId` joins
 * against the server-side catalog (`"<gameId>:<externalId>"`, e.g.
 * `"pokemon:sv3pt5-136"`) to resolve name/image/live price at render time —
 * nothing about the card itself is duplicated here.
 */
export interface Holding {
  id: string;
  catalogItemId: string;
  quantity: number;
  condition: CardCondition;
  gradeCompany?: string;
  gradeValue?: string;
  language: ItemLanguage;
  costBasisTotal: number;
  costBasisCurrency: SupportedCurrency;
  acquiredAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Portfolio {
  id: string;
  name: string;
  createdAt: string;
  holdings: Holding[];
}

export interface Preferences {
  currency: SupportedCurrency;
  theme: "dark" | "light";
  viewMode: ViewMode;
}

/** Root shape persisted to localStorage under `cardstory:portfolio:v1`. */
export interface PortfolioStoreDataV1 {
  schemaVersion: 1;
  activePortfolioId: string;
  portfolios: Portfolio[];
  /** catalogItemIds the user is watching — independent of ownership. */
  watchlist: string[];
  preferences: Preferences;
}

export type NewHoldingInput = Omit<Holding, "id" | "createdAt" | "updatedAt">;
