/**
 * Physical Binder Import — the domain model for turning one photographed
 * binder page into a set of exact pocket placements. Built entirely on top
 * of the shared scanning engine's types (src/lib/scanning/types.ts) and the
 * existing Binder Planner's pocket indexing (src/lib/binder/types.ts) —
 * this file adds nothing to either of those, it only describes the
 * in-progress review/commit state that sits between "a ScanResult came
 * back" and "cards are placed in a BinderPage".
 *
 * Session state lives entirely in React state (see
 * src/app/binder/import/_components/import-client.tsx) — same convention
 * as the Mass Card Scanner (scan-client.tsx), which also never persists its
 * working session. A page refresh mid-import loses the current session;
 * anything already confirmed and committed (see session-state.ts's commit
 * helpers) is unaffected, since it already landed in PC/Binder storage.
 */
import type { BinderLayoutId } from "@/lib/binder/types";
import type { DetectedCard } from "@/lib/scanning";

export type ImportStage = "DRAFT" | "REVIEWING" | "CONFIRMED" | "COMMITTED";

/**
 * One binder-page-import stage a reviewer explicitly steps through with a
 * physical binder page. Kept purely for pocket-review-control.tsx labeling
 * / gating, not to imply a formal state machine on its own — the actual
 * transitions are enforced by advanceStage below.
 */
export const IMPORT_STAGE_ORDER: ImportStage[] = ["DRAFT", "REVIEWING", "CONFIRMED", "COMMITTED"];

/**
 * A reviewer's explicit decision on one pocket:
 * - "identified": a DetectedCard is present and a candidate is selected —
 *   ready to become a Holding, pending any binder-pocket conflict.
 * - "empty": no card belongs here (either genuinely undetected/no card, or
 *   the reviewer decided this pocket really is empty in the physical
 *   binder). Never compacted — an empty pocket stays exactly where it is.
 * - "unidentified": a card was detected here but no candidate could be
 *   confidently selected — excluded from commit until a reviewer resolves
 *   it (see markPocketUnidentified).
 * - "skip": a reviewer deliberately excludes this pocket from the import
 *   without claiming it's empty (e.g. "that's a sleeve corner, not a
 *   card") — distinct from "empty", same distinction corrections.ts draws
 *   between skipped and unidentified for the Mass Scanner.
 * - "conflict": two detected boxes both mapped to this pocketIndex (a grid
 *   mapping conflict — see mapCardsToGrid), OR this pocket already holds a
 *   card in the live binder and hasn't been resolved yet (a binder
 *   conflict — see detectBinderConflicts). Blocks commit until resolved.
 */
export type PlacementStatus = "identified" | "empty" | "unidentified" | "skip" | "conflict";

export interface PagePlacement {
  /** row*cols+col — matches BinderPage.pockets' own row-major indexing exactly. */
  pocketIndex: number;
  status: PlacementStatus;
  /** The detected card occupying this pocket, if any — absent for a genuinely empty pocket. */
  card?: DetectedCard;
  /**
   * Set only when this pocket's grid mapping was ambiguous (mapCardsToGrid
   * reported >1 box for this pocketIndex) — every candidate box for the
   * reviewer to choose between. Cleared once resolved via
   * resolvePocketAmbiguity.
   */
  ambiguousCards?: DetectedCard[];
  /**
   * Populated by detectBinderConflicts when the *live* binder already has a
   * holding in this pocket at commit time — distinct from ambiguousCards
   * (a grid-detection ambiguity) even though both surface as
   * status:"conflict". Null once resolved.
   */
  existingHoldingId?: string | null;
  conflictResolution?: "keep" | "replace" | null;
}

export interface ImportPageResult {
  /** The physical page number the user typed/confirmed for this photo — never inferred from card content or scan order. */
  physicalPageNumber: number;
  sourcePreviewUrl: string;
  scanResultId: string;
  /** Snapshot of the binder's layout at scan time, so a mid-import layout change on the binder itself can't silently reinterpret an already-scanned page. */
  layoutIdAtScanTime: BinderLayoutId;
  /** Always length === pocketCount(layoutIdAtScanTime), index-aligned to pocketIndex. */
  placements: PagePlacement[];
  confirmed: boolean;
}

export interface ImportSession {
  sessionId: string;
  binderId: string;
  layoutId: BinderLayoutId;
  stage: ImportStage;
  pages: ImportPageResult[];
  currentPageIndex: number;
  createdAt: string;
}

/** Per-page counts for the confirm bar — see computePageSummary. */
export interface PageSummary {
  total: number;
  identified: number;
  empty: number;
  unidentified: number;
  skipped: number;
  conflicts: number;
  /** identified, not in unresolved conflict — what would actually commit right now. */
  readyToCommit: number;
}
