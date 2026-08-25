import type { SupportedCurrency, RawCardCondition, LetGoMethod, AcquisitionMethod } from "@/lib/constants";
import type { LetGoDetails } from "@/lib/pc/api-schemas";

export type CardCondition = "raw" | "graded";
export type ItemLanguage = "EN" | "JP" | "CN" | "TW" | "KR";
export type ViewMode = "grid" | "list";
export type HoldingKind = "tcg" | "sports";

/**
 * How the PC List/Gallery is ordered. "dateAdded" sorts on a holding's
 * immutable `createdAt` (when it was added to CardStory); "dateAcquired"
 * sorts on the user-editable, optional `acquiredAt` (see Holding.acquiredAt
 * below for why the two are kept distinct) — holdings with no acquiredAt
 * sort last regardless of direction. "name"/"setName" sort on the
 * resolved display name / set name.
 */
export type SortField = "dateAdded" | "dateAcquired" | "name" | "setName";
export type SortDirection = "asc" | "desc";

/**
 * A single owned line-item in a local PC.
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
  /** Physical grading — only meaningful when condition is "raw". */
  rawCondition?: RawCardCondition;
  serialNumber?: string;
  language: ItemLanguage;
  /**
   * Free-text name for a hand-keyed card that matches nothing in either
   * catalog — set only when both catalogItemId and sportsCardItemId are
   * absent. The one self-describing card reference in the app: everything
   * else resolves its name from a shared CatalogItem/SportsCardItem row.
   * Created by checking out a "custom" In-Store Shortlist item (see
   * src/lib/shortlist/types.ts).
   */
  customName?: string;
  costBasisTotal: number;
  costBasisCurrency: SupportedCurrency;
  /**
   * The item's live unit market price (USD, per-unit — not quantity-scaled)
   * on `acquiredAt`, resolved server-side/client-side via the
   * /api/pricing/at-date lookup (or the already-known live price when
   * acquiredAt is today). Null/undefined when that history isn't available,
   * or the holding predates this field.
   */
  priceAtAcquisition?: number | null;
  /**
   * When the user physically acquired this card — distinct from
   * `createdAt` below (when the row was added to CardStory). Null unless
   * the user explicitly set it; never defaulted to "today" on add, since
   * this is meant to eventually back an acquisition-history feature where
   * an honestly-empty date matters.
   */
  acquiredAt: string | null;
  /** How the card came into the collection — bought/traded/gifted/pack/other. */
  acquisitionMethod?: AcquisitionMethod;
  /** Free-text: who or where the card was obtained from — shown regardless of acquisitionMethod, same convention as letGoTo. */
  acquiredFrom?: string;
  /** Free-text elaboration, only meaningful when acquisitionMethod is "other". */
  acquisitionNotes?: string;
  notes?: string;
  /** Photo of this specific physical card — the owner's own copy, not the shared catalog image. */
  imageUrl?: string;
  /**
   * When this holding was archived (soft-deleted) out of the active
   * collection — null/undefined means it's still active. See
   * holdingIsArchived below and src/components/pc/archive-client.tsx.
   */
  archivedAt?: string | null;
  /** When the card actually left the collection — distinct from archivedAt, same relationship as acquiredAt vs createdAt. */
  letGoAt?: string | null;
  letGoMethod?: LetGoMethod;
  /** Free-text: who or what the card was passed on to. */
  letGoTo?: string;
  /** Denominated in letGoCurrency, not USD — same convention as costBasisTotal. */
  letGoAmount?: number | null;
  letGoCurrency?: SupportedCurrency;
  letGoNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export function holdingKind(h: Pick<Holding, "kind" | "sportsCardItemId">): HoldingKind {
  return h.kind ?? (h.sportsCardItemId ? "sports" : "tcg");
}

/**
 * A hand-keyed holding, carrying its own name instead of a catalog
 * reference. It has no market price, so callers that compute value or
 * gain/loss must exclude it rather than treat it as a $0 card (see
 * enrichHoldings/computeTotals in src/lib/pc/selectors.ts).
 */
export function holdingIsCustom(
  h: Pick<Holding, "catalogItemId" | "sportsCardItemId" | "customName">
): boolean {
  return !h.catalogItemId && !h.sportsCardItemId && !!h.customName;
}

/** True once a holding has been archived (removed from the active collection but retained in Archives). */
export function holdingIsArchived(h: Pick<Holding, "archivedAt">): boolean {
  return !!h.archivedAt;
}

export type PCKind = "personal" | "business";

export interface PC {
  id: string;
  name: string;
  /**
   * PCs created before this field existed have no `kind` at all —
   * treat a missing `kind` as `"personal"`, same convention as
   * `holdingKind` above. `"business"` marks the single auto-created
   * "Business Inventory" PC a vendor's Explore-area "Business mode"
   * toggle adds new holdings to (see ensureBusinessPC in
   * remote-store.ts / manage.ts).
   */
  kind?: PCKind;
  createdAt: string;
  holdings: Holding[];
}

export function pcKind(p: Pick<PC, "kind">): PCKind {
  return p.kind ?? "personal";
}

export interface Preferences {
  currency: SupportedCurrency;
  theme: "dark" | "light";
  viewMode: ViewMode;
  /** How the PC List/Gallery is ordered — see SortField/SortDirection above. */
  sortField: SortField;
  sortDirection: SortDirection;
  /** Last currency picked in an Add-to-PC dialog — pre-fills the next one. */
  lastUsedCostBasisCurrency: SupportedCurrency;
  /**
   * Vendor-only Explore-area toggle: when on, new holdings added from
   * Explore default into the "Business Inventory" PC instead of the
   * active one. Local UI state like the rest of Preferences — stays local
   * even for signed-in users (see remote-store.ts) — but only ever
   * surfaced when the signed-in account's isVendor flag (server-side,
   * prisma/schema.prisma) is set.
   */
  businessMode: boolean;
  /**
   * When on, an Explore card's add-to-PC click skips AddHoldingDialog and
   * adds straight into a PC with default values — the active one, or the
   * Business Inventory pc when businessMode is also on. The two compose:
   * businessMode picks the destination PC, quickAdd decides whether the
   * dialog is skipped to get there. Local UI state, same as businessMode —
   * stays local even for signed-in users (see remote-store.ts).
   */
  quickAdd: boolean;
}

/**
 * An item the user is tracking without (yet) owning — independent of any
 * Holding. `itemId` is a CatalogItem.id ("<gameId>:<externalId>") when kind
 * is "tcg", or a raw SportsCardItem.id (cuid) when kind is "sports" — the
 * same id shape `Holding.catalogItemId`/`sportsCardItemId` already use.
 * `priceAtAdd` is the live unit price at the moment it was starred — always
 * "now" (a single click, never backdated), so unlike
 * Holding.priceAtAcquisition it's never a historical lookup.
 */
export interface WatchlistItem {
  itemId: string;
  kind: HoldingKind;
  addedAt: string;
  priceAtAdd: number | null;
}

/** Root shape persisted to localStorage under `cardstory:portfolio:v1`. */
export interface PCStoreDataV1 {
  schemaVersion: 1;
  activePCId: string;
  pcs: PC[];
  watchlist: WatchlistItem[];
  preferences: Preferences;
}

export type NewHoldingInput = Omit<Holding, "id" | "createdAt" | "updatedAt">;

/**
 * Every mutation the pc store exposes — same shape whether it's ultimately
 * backed by the server (src/lib/pc/remote-store.ts, the only implementation
 * left; see git history for the anonymous localStorage version this
 * replaced) so consuming components never know which is live.
 */
export interface PCActions {
  setCurrency: (currency: SupportedCurrency) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  setLastUsedCostBasisCurrency: (currency: SupportedCurrency) => void;
  setBusinessMode: (businessMode: boolean) => void;
  setQuickAdd: (quickAdd: boolean) => void;

  createPC: (name: string) => string;
  renamePC: (pcId: string, name: string) => void;
  deletePC: (pcId: string) => void;
  setActivePC: (pcId: string) => void;
  /** Returns the id of the "Business Inventory" PC, creating it first if this is the first time it's needed. */
  ensureBusinessPC: () => string;

  /**
   * Promise-returning since useRemotePCStore's addHolding genuinely can
   * fail server-side — callers await/catch this instead of assuming it
   * always lands.
   */
  addHolding: (pcId: string, input: NewHoldingInput) => Promise<string>;
  updateHolding: (
    pcId: string,
    holdingId: string,
    patch: Partial<Omit<Holding, "id">>
  ) => void;
  /**
   * Soft-deletes holdings out of the active pc into Archives (see
   * src/components/pc/archive-client.tsx) — the everyday "remove a card"
   * path. `letGo` is optional; the row keeps every other field intact.
   */
  archiveHoldings: (pcId: string, holdingIds: string[], letGo?: LetGoDetails) => void;
  removeHoldings: (pcId: string, holdingIds: string[]) => void;
  copyHoldings: (fromId: string, toId: string, holdingIds: string[]) => void;
  moveHoldings: (fromId: string, toId: string, holdingIds: string[]) => void;

  toggleWatchlist: (itemId: string, kind: HoldingKind, priceAtAdd: number | null) => void;
  isWatchlisted: (itemId: string) => boolean;
}

export type PCState = PCStoreDataV1 & PCActions;
