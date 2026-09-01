/**
 * Virtual binder — a per-page grid of "pockets" the user assigns pc
 * holdings to, purely to preview how a physical binder page would look.
 * Lives entirely in localStorage (see store.ts); it references holdings by
 * id but never mutates the pc itself.
 */

export const BINDER_LAYOUTS = {
  "4": { rows: 2, cols: 2, label: "4-Pocket" },
  "6": { rows: 2, cols: 3, label: "6-Pocket" },
  "9": { rows: 3, cols: 3, label: "9-Pocket" },
  "12": { rows: 3, cols: 4, label: "12-Pocket" },
  "16": { rows: 4, cols: 4, label: "16-Pocket" },
  "20": { rows: 4, cols: 5, label: "20-Pocket" },
} as const satisfies Record<string, { rows: number; cols: number; label: string }>;

export type BinderLayoutId = keyof typeof BINDER_LAYOUTS;

export const BINDER_LAYOUT_IDS = Object.keys(BINDER_LAYOUTS) as BinderLayoutId[];

export function pocketCount(layoutId: BinderLayoutId): number {
  const l = BINDER_LAYOUTS[layoutId];
  return l.rows * l.cols;
}

/** Cosmetic cover accents — purely visual, no bearing on layout. */
export const BINDER_COVER_COLORS = [
  { id: "espresso", label: "Espresso", value: "#4a3524" },
  { id: "camel", label: "Camel", value: "#a3814f" },
  { id: "forest", label: "Forest", value: "#4a5d3a" },
  { id: "burgundy", label: "Burgundy", value: "#7a3242" },
  { id: "navy", label: "Navy", value: "#2f4258" },
  { id: "charcoal", label: "Charcoal", value: "#33302b" },
] as const;

export type BinderCoverColorId = (typeof BINDER_COVER_COLORS)[number]["id"];

export function coverColorValue(id: BinderCoverColorId): string {
  return BINDER_COVER_COLORS.find((c) => c.id === id)?.value ?? BINDER_COVER_COLORS[0].value;
}

/**
 * What a pocket holds: either a real pc holding the user owns, or a bare
 * catalog reference for a card they've placed to plan around but don't
 * actually have yet (added from the card picker's "Not Owned" tab — see
 * card-picker-sheet.tsx). Only the "holding" kind ever gets cleaned up by
 * removeHoldingEverywhere; a "catalog" pocket has no Holding to go stale.
 */
export type BinderPocketRef =
  | { kind: "holding"; holdingId: string }
  | { kind: "catalog"; catalogItemId: string };

export interface BinderPage {
  id: string;
  /** Pocket reference per slot, in row-major order (top-left to bottom-right); null = empty pocket. */
  pockets: (BinderPocketRef | null)[];
}

/** A plain, user-set label — never auto-derived from whether every card in the binder is owned. Same convention as Deck.status. */
export type BinderStatus = "wip" | "live";

export interface Binder {
  id: string;
  name: string;
  layoutId: BinderLayoutId;
  coverColor: BinderCoverColorId;
  status: BinderStatus;
  pages: BinderPage[];
  createdAt: string;
  updatedAt: string;
}

export interface BinderStoreDataV2 {
  schemaVersion: 2;
  activeBinderId: string;
  binders: Binder[];
  /** Whether each pocket's card-number tag (top-left overlay) is shown. Defaults to on. */
  showNumberTags: boolean;
  /** Whether the "Not owned" tag is shown on catalog-only pockets. Defaults to on. */
  showNotOwnedTags: boolean;
}

/** A pocket currently targeted for placement, identified by page + slot index. */
export interface PocketRef {
  pageId: string;
  slotIndex: number;
}
