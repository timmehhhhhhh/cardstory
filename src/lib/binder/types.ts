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

/**
 * Cosmetic cover accents — purely visual, no bearing on layout. Matches the
 * colorway actually sold across Palms Off Gaming's Stealth 9-Pocket and
 * 12-Pocket Zip Binders (Black/Blue/Pink/Purple/Red on the current site;
 * Yellow/Turquoise were 9-pocket colorways from third-party listings) so a
 * planned binder can be bought as pictured. Hex values are estimates from
 * product photos, not sampled swatches.
 */
export const BINDER_COVER_COLORS = [
  { id: "black", label: "Black", value: "#1a1a1a" },
  { id: "blue", label: "Blue", value: "#1e4d8c" },
  { id: "pink", label: "Pink", value: "#e05a96" },
  { id: "purple", label: "Purple", value: "#5b3a8e" },
  { id: "red", label: "Red", value: "#b3242c" },
  { id: "yellow", label: "Yellow", value: "#e0b020" },
  { id: "turquoise", label: "Turquoise", value: "#1aa9a0" },
] as const;

export type BinderCoverColorId = (typeof BINDER_COVER_COLORS)[number]["id"];

export function coverColorValue(id: BinderCoverColorId): string {
  return BINDER_COVER_COLORS.find((c) => c.id === id)?.value ?? BINDER_COVER_COLORS[0].value;
}

/** What fills the page surface behind/around the pockets. "match-cover" follows the binder's own coverColor. */
export type PageBackground = "match-cover" | "black" | "white";

export function resolvedPageBackgroundColor(bg: PageBackground, coverColorId: BinderCoverColorId): string {
  if (bg === "black") return "#0a0a0a";
  if (bg === "white") return "#ffffff";
  return coverColorValue(coverColorId);
}

/**
 * What a pocket holds:
 * - "holding": a real pc holding the user owns.
 * - "catalog": a bare catalog reference for a card placed to plan around
 *   but not actually owned yet (added from the card picker's "Not Owned"
 *   tab — see card-picker-sheet.tsx).
 * - "custom": a user-uploaded image (the "Michi Method") anchored at this
 *   slot and spanning `spanCols` × `spanRows` pockets from here.
 * - "custom-covered": a sentinel marking a slot occupied by a "custom"
 *   ref anchored elsewhere — never placed into directly, only produced by
 *   placeCustomImage.
 *
 * Only the "holding" kind ever gets cleaned up by removeHoldingEverywhere;
 * a "catalog" pocket has no Holding to go stale.
 */
export type BinderPocketRef =
  | { kind: "holding"; holdingId: string }
  | { kind: "catalog"; catalogItemId: string }
  | { kind: "custom"; dataUrl: string; spanCols: number; spanRows: number }
  | { kind: "custom-covered"; anchorSlotIndex: number };

/** Flat-array slot indices a custom-image span covers, given its anchor and the page's column count. */
export function customSpanCells(anchorSlotIndex: number, spanCols: number, spanRows: number, cols: number): number[] {
  const anchorRow = Math.floor(anchorSlotIndex / cols);
  const anchorCol = anchorSlotIndex % cols;
  const cells: number[] = [];
  for (let r = 0; r < spanRows; r++) {
    for (let c = 0; c < spanCols; c++) {
      cells.push((anchorRow + r) * cols + (anchorCol + c));
    }
  }
  return cells;
}

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
  /** Fill behind the pocket grid — defaults to following coverColor. */
  pageBackground: PageBackground;
  status: BinderStatus;
  pages: BinderPage[];
  createdAt: string;
  updatedAt: string;
}

export interface BinderStoreDataV3 {
  schemaVersion: 3;
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
