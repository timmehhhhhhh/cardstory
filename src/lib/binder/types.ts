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

export interface BinderPage {
  id: string;
  /** holdingId per pocket, in row-major order (top-left to bottom-right); null = empty pocket. */
  pockets: (string | null)[];
}

export interface Binder {
  id: string;
  name: string;
  layoutId: BinderLayoutId;
  coverColor: BinderCoverColorId;
  pages: BinderPage[];
  createdAt: string;
  updatedAt: string;
}

export interface BinderStoreDataV1 {
  schemaVersion: 1;
  activeBinderId: string;
  binders: Binder[];
}

/** A pocket currently targeted for placement, identified by page + slot index. */
export interface PocketRef {
  pageId: string;
  slotIndex: number;
}
