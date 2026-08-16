import type { SupportedCurrency } from "@/lib/constants";

export type CardCondition = "raw" | "graded";
export type ItemLanguage = "EN" | "JP" | "CN" | "TW" | "KR";
export type ViewMode = "grid" | "list";
export type HoldingKind = "tcg" | "sports";

/**
 * A single owned line-item in a local portfolio.
 *
 * - `kind: "tcg"` — `catalogItemId` joins against the server-side TCG
 *   catalog (`"<gameId>:<externalId>"`, e.g. `"pokemon:sv3pt5-136"`).
 * - `kind: "sports"` — `sportsCardItemId` joins against a SportsCardItem
 *   (the shared sport+set+player+parallel record; see prisma/schema.prisma).
 *
 * Older holdings created before sports cards existed have no `kind` field
 * at all — treat a missing `kind` as `"tcg"` (they all had catalogItemId).
 * `serialNumber` is the specific numbered copy owned (e.g. "23" of a
 * card numbered to `SportsCardItem.serialLimit`) — ownership info, so it
 * lives here rather than on the shared card-type record.
 */
export interface Holding {
  id: string;
  kind?: HoldingKind;
  catalogItemId?: string;
  sportsCardItemId?: string;
  quantity: number;
  condition: CardCondition;
  gradeCompany?: string;
  gradeValue?: string;
  serialNumber?: string;
  language: ItemLanguage;
  costBasisTotal: number;
  costBasisCurrency: SupportedCurrency;
  acquiredAt: string;
  notes?: string;
  /** Photo of this specific physical card — the owner's own copy, not the shared catalog image. */
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export function holdingKind(h: Pick<Holding, "kind" | "sportsCardItemId">): HoldingKind {
  return h.kind ?? (h.sportsCardItemId ? "sports" : "tcg");
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
