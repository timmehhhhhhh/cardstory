/**
 * Pure, feature-local state derivation for Physical Binder Import — the
 * binder-page-shaped counterpart to src/lib/scan-cards/review-state.ts.
 *
 * Same bundle-safety stance as that file: every import from
 * "@/lib/scanning" below is `import type` only, and `applyCandidateSelection`
 * is reimplemented here rather than imported from src/lib/scanning/
 * corrections.ts, because that file transitively pulls in
 * identify/gemini-identification.ts -> rank-candidates.ts ->
 * src/lib/catalog/search.ts -> src/lib/db.ts (Prisma's WASM query engine)
 * at module scope — weight this client bundle (imported by
 * src/app/binder/import/_components/import-client.tsx) can't carry. This
 * duplicates that function's *behavior*, not the engine's actual
 * detection/identification/ranking logic, which stays untouched in
 * src/lib/scanning.
 *
 * `mapCardsToGrid` (src/lib/scanning/geometry.ts) IS imported directly —
 * it's pure geometry with zero server/Prisma dependency, same as
 * `computeNeedsReview` (src/lib/scanning/confidence.ts) below.
 *
 * No React here — src/app/binder/import/_components/import-client.tsx is
 * the only caller, and it's the one place these functions' results get
 * held in component state (see src/lib/binder-import/types.ts's header for
 * why the session itself is never persisted).
 */
import { computeNeedsReview } from "@/lib/scanning/confidence";
import { mapCardsToGrid } from "@/lib/scanning/geometry";
import type { CandidateMatch, DetectedCard, ScanResult } from "@/lib/scanning";
import { BINDER_LAYOUTS, pocketCount, type BinderLayoutId } from "@/lib/binder/types";
import type { NewHoldingInput } from "@/lib/pc/types";
import { getGameMeta } from "@/lib/games/registry";
import type {
  ImportPageResult,
  ImportSession,
  ImportStage,
  PagePlacement,
  PageSummary,
} from "./types";

/** Client-safe reimplementation of corrections.ts's applyManualCorrection — see file header for why this isn't imported directly. */
function applyCandidateSelection(card: DetectedCard, catalogItemId: string): DetectedCard {
  const isOffered = card.candidates.some((c) => c.catalogItemId === catalogItemId);
  if (!isOffered) {
    throw new Error(`Candidate ${catalogItemId} was not among the offered candidates for card ${card.cardId}`);
  }
  return { ...card, selectedCandidateId: catalogItemId, needsReview: false };
}

/** True when a card should arrive pre-selected: the pipeline is fully confident AND actually identified something — same rule review-state.ts's isAutoAcceptable uses for the Mass Scanner. */
function isAutoAcceptable(card: DetectedCard): boolean {
  return card.confidenceLevel === "HIGH" && card.identificationStatus === "identified" && card.candidates.length > 0;
}

const STAGE_TRANSITIONS: Record<ImportStage, ImportStage[]> = {
  DRAFT: ["REVIEWING"],
  REVIEWING: ["CONFIRMED", "DRAFT"],
  CONFIRMED: ["COMMITTED", "REVIEWING"],
  COMMITTED: [],
};

export function createSession(binderId: string, layoutId: BinderLayoutId, sessionId: string): ImportSession {
  return {
    sessionId,
    binderId,
    layoutId,
    stage: "DRAFT",
    pages: [],
    currentPageIndex: 0,
    createdAt: new Date().toISOString(),
  };
}

/** Enforces the linear DRAFT -> REVIEWING -> CONFIRMED -> COMMITTED sequence (with REVIEWING/CONFIRMED allowed to step back one stage for "go back and fix something") — throws on any other jump. */
export function advanceStage(session: ImportSession, next: ImportStage): ImportSession {
  const allowed = STAGE_TRANSITIONS[session.stage];
  if (!allowed.includes(next)) {
    throw new Error(`Cannot move import session from ${session.stage} to ${next}`);
  }
  return { ...session, stage: next };
}

/**
 * Builds one ImportPageResult from a fresh ScanResult: maps every detected
 * card's boundingBox onto the binder's own rows x cols grid via
 * mapCardsToGrid (geometry-driven, never detection order — see that
 * function's doc comment), then classifies each pocket's status. A pocket
 * two boxes both map to becomes "conflict" with both cards offered via
 * ambiguousCards, for a reviewer to pick between (see
 * resolvePocketAmbiguity) — never auto-resolved. Pockets with zero boxes
 * stay "empty": never compacted, per the spec's core requirement.
 */
export function buildPagePlacements(
  scanResult: ScanResult,
  layoutId: BinderLayoutId,
  physicalPageNumber: number,
  sourcePreviewUrl: string
): ImportPageResult {
  const { rows, cols } = BINDER_LAYOUTS[layoutId];
  const slots = pocketCount(layoutId);
  const boxes = scanResult.cards.map((c) => c.boundingBox);
  const mapping = mapCardsToGrid(boxes, rows, cols);

  const cardsByPocket = new Map<number, DetectedCard[]>();
  mapping.cells.forEach((cell, boxIndex) => {
    const card = scanResult.cards[boxIndex];
    const list = cardsByPocket.get(cell.pocketIndex);
    if (list) list.push(card);
    else cardsByPocket.set(cell.pocketIndex, [card]);
  });

  const placements: PagePlacement[] = Array.from({ length: slots }, (_, pocketIndex) => {
    const cards = cardsByPocket.get(pocketIndex);
    if (!cards || cards.length === 0) {
      return { pocketIndex, status: "empty" };
    }
    if (cards.length > 1) {
      return { pocketIndex, status: "conflict", ambiguousCards: cards };
    }
    const card = cards[0];
    const finalCard = isAutoAcceptable(card) ? applyCandidateSelection(card, card.candidates[0].catalogItemId) : card;
    if (finalCard.skipped) return { pocketIndex, status: "skip", card: finalCard };
    if (finalCard.selectedCandidateId) return { pocketIndex, status: "identified", card: finalCard };
    return { pocketIndex, status: "unidentified", card: finalCard };
  });

  return {
    physicalPageNumber,
    sourcePreviewUrl,
    scanResultId: scanResult.scanResultId,
    layoutIdAtScanTime: layoutId,
    placements,
    confirmed: false,
  };
}

function requirePlacement(page: ImportPageResult, pocketIndex: number): PagePlacement {
  const placement = page.placements[pocketIndex];
  if (!placement) throw new Error(`No placement at pocket ${pocketIndex}`);
  return placement;
}

function replacePlacement(page: ImportPageResult, pocketIndex: number, next: PagePlacement): ImportPageResult {
  return { ...page, placements: page.placements.map((p, i) => (i === pocketIndex ? next : p)) };
}

/**
 * Resolves a grid-mapping ambiguity (two boxes assigned the same pocket) by
 * picking which detected card actually belongs there — `chosenCard` must be
 * one of the placement's `ambiguousCards`. The other candidate is dropped
 * from this pocket entirely (not moved elsewhere automatically — a
 * reviewer who believes the other card belongs in a different, empty
 * pocket re-scans or uses "change card" on that pocket separately).
 */
export function resolvePocketAmbiguity(page: ImportPageResult, pocketIndex: number, chosenCard: DetectedCard): ImportPageResult {
  const placement = requirePlacement(page, pocketIndex);
  if (!placement.ambiguousCards) {
    throw new Error(`Pocket ${pocketIndex} has no ambiguity to resolve`);
  }
  const isOffered = placement.ambiguousCards.some((c) => c.cardId === chosenCard.cardId);
  if (!isOffered) {
    throw new Error(`Card ${chosenCard.cardId} was not among pocket ${pocketIndex}'s ambiguous candidates`);
  }
  const finalCard = isAutoAcceptable(chosenCard)
    ? applyCandidateSelection(chosenCard, chosenCard.candidates[0].catalogItemId)
    : chosenCard;
  const status = finalCard.skipped ? "skip" : finalCard.selectedCandidateId ? "identified" : "unidentified";
  return replacePlacement(page, pocketIndex, { pocketIndex, status, card: finalCard });
}

/**
 * Applies a reviewer's manual "change card" pick to a pocket that already
 * has a detected card (identified, unidentified, or a resolved ambiguity).
 * `candidate` need not have been among the card's originally offered
 * candidates — mirrors review-state.ts's setCandidate for the same reason
 * (a catalog search result).
 */
export function setPlacementCandidate(page: ImportPageResult, pocketIndex: number, candidate: CandidateMatch): ImportPageResult {
  const placement = requirePlacement(page, pocketIndex);
  if (!placement.card) {
    throw new Error(`Pocket ${pocketIndex} has no detected card to assign a candidate to`);
  }
  const alreadyOffered = placement.card.candidates.some((c) => c.catalogItemId === candidate.catalogItemId);
  const cardWithCandidate = alreadyOffered
    ? placement.card
    : { ...placement.card, candidates: [candidate, ...placement.card.candidates] };
  const nextCard = applyCandidateSelection(cardWithCandidate, candidate.catalogItemId);
  return replacePlacement(page, pocketIndex, { pocketIndex, status: "identified", card: nextCard });
}

/** Marks a pocket deliberately empty — clears any detected card at that pocketIndex. Never compacts other pockets. */
export function markPocketEmpty(page: ImportPageResult, pocketIndex: number): ImportPageResult {
  requirePlacement(page, pocketIndex);
  return replacePlacement(page, pocketIndex, { pocketIndex, status: "empty" });
}

/** Marks a pocket skipped — distinct from "empty": a reviewer excluding a detected region without claiming there's no physical card there. */
export function markPocketSkip(page: ImportPageResult, pocketIndex: number): ImportPageResult {
  const placement = requirePlacement(page, pocketIndex);
  return replacePlacement(page, pocketIndex, { ...placement, status: "skip" });
}

/** Reverses a skip/identified pick back to "still needs a human look" without discarding the detected card. */
export function markPocketUnidentified(page: ImportPageResult, pocketIndex: number): ImportPageResult {
  const placement = requirePlacement(page, pocketIndex);
  if (!placement.card) {
    throw new Error(`Pocket ${pocketIndex} has no detected card to mark unidentified`);
  }
  return replacePlacement(page, pocketIndex, {
    pocketIndex,
    status: "unidentified",
    card: { ...placement.card, selectedCandidateId: null, needsReview: computeNeedsReview(placement.card.confidenceLevel, "unidentified") },
  });
}

/**
 * Diffs every "identified" placement against the *live* binder page's
 * current pockets (re-read at commit time, not a stale session snapshot —
 * see import-client.tsx) — any pocket that already holds a card flips to
 * "conflict" with `existingHoldingId` set and `conflictResolution: null`,
 * blocking commit until resolveBinderConflict runs. Pure diff — never
 * mutates the live binder itself.
 */
export function detectBinderConflicts(page: ImportPageResult, existingPagePockets: (string | null)[]): ImportPageResult {
  const placements = page.placements.map((placement): PagePlacement => {
    if (placement.status !== "identified") return placement;
    const existingHoldingId = existingPagePockets[placement.pocketIndex] ?? null;
    if (existingHoldingId == null) return placement;
    return { ...placement, status: "conflict", existingHoldingId, conflictResolution: null };
  });
  return { ...page, placements };
}

/** "keep": the existing pocket is left untouched, this pocket's detected card is excluded from commit. "replace": this pocket's detected card overwrites the existing one on commit. */
export function resolveBinderConflict(page: ImportPageResult, pocketIndex: number, resolution: "keep" | "replace"): ImportPageResult {
  const placement = requirePlacement(page, pocketIndex);
  if (placement.status !== "conflict") {
    throw new Error(`Pocket ${pocketIndex} is not in conflict`);
  }
  return replacePlacement(page, pocketIndex, { ...placement, conflictResolution: resolution });
}

/** True while any pocket's binder-vs-existing conflict hasn't been explicitly resolved — blocks commit. */
export function hasUnresolvedConflicts(page: ImportPageResult): boolean {
  return page.placements.some((p) => p.status === "conflict" && p.conflictResolution == null);
}

/** A placement that will actually produce a Holding write on commit: identified outright, or a conflict explicitly resolved to "replace". "keep" conflicts and every other status are excluded. */
function isCommittable(placement: PagePlacement): boolean {
  if (placement.status === "identified") return true;
  if (placement.status === "conflict" && placement.conflictResolution === "replace") return true;
  return false;
}

export interface HoldingDefaults {
  language: NewHoldingInput["language"];
  costBasisCurrency: NewHoldingInput["costBasisCurrency"];
}

/** One generated Holding write, carrying its target pocketIndex through so the commit step (§5 of the plan) can placeCard once the write succeeds. */
export type PlacementHoldingInput = NewHoldingInput & { id: string; pocketIndex: number };

/**
 * Maps every committable placement into a Holding write — one row per
 * pocket, quantity 1 each. Two distinct pockets holding the "same" physical
 * card (a duplicate) become two separate rows here, same convention
 * toHoldingInputs (review-state.ts) already uses for the Mass Scanner.
 * `id` is generated by the caller (client-side, idempotent on retry via
 * addHoldingsBatch's upsert-by-id — see src/lib/pc/manage.ts).
 */
export function toPlacementHoldingInputs(
  page: ImportPageResult,
  defaults: HoldingDefaults,
  makeId: () => string
): PlacementHoldingInput[] {
  return page.placements.filter(isCommittable).map((placement) => {
    const card = placement.card!;
    const candidate = card.candidates.find((c) => c.catalogItemId === card.selectedCandidateId);
    const kind: NewHoldingInput["kind"] =
      candidate?.gameId && getGameMeta(candidate.gameId)?.kind === "sports" ? "sports" : "tcg";
    return {
      id: makeId(),
      pocketIndex: placement.pocketIndex,
      kind,
      catalogItemId: kind === "tcg" ? (card.selectedCandidateId ?? undefined) : undefined,
      sportsCardItemId: kind === "sports" ? (card.selectedCandidateId ?? undefined) : undefined,
      quantity: 1,
      condition: "raw",
      language: defaults.language,
      costBasisTotal: 0,
      costBasisCurrency: defaults.costBasisCurrency,
      acquiredAt: null,
    };
  });
}

/**
 * Given the batch-write results (see src/app/api/pc/[id]/holdings/batch),
 * returns only the {holdingId, pocketIndex} pairs that actually succeeded —
 * the compensating-strategy primitive the commit flow uses to decide which
 * pockets get placeCard'd. A "failed" result never appears here, so a
 * caller that only ever calls placeCard for this function's output can
 * never place a pocket whose Holding write didn't actually happen.
 * Idempotent to call again after a retry: re-run with the retry's results
 * and only the newly-succeeded ids appear (a caller tracking which
 * pocketIndexes it already placed simply skips ones it's already handled).
 */
export function placementsToApply(
  items: PlacementHoldingInput[],
  results: { id: string; status: "created" | "failed"; error?: string }[]
): { holdingId: string; pocketIndex: number }[] {
  const succeededIds = new Set(results.filter((r) => r.status === "created").map((r) => r.id));
  return items.filter((item) => succeededIds.has(item.id)).map((item) => ({ holdingId: item.id, pocketIndex: item.pocketIndex }));
}

export function computePageSummary(page: ImportPageResult): PageSummary {
  const total = page.placements.length;
  return {
    total,
    identified: page.placements.filter((p) => p.status === "identified").length,
    empty: page.placements.filter((p) => p.status === "empty").length,
    unidentified: page.placements.filter((p) => p.status === "unidentified").length,
    skipped: page.placements.filter((p) => p.status === "skip").length,
    conflicts: page.placements.filter((p) => p.status === "conflict").length,
    readyToCommit: page.placements.filter(isCommittable).length,
  };
}

/** Appends a freshly scanned page to the session and moves the working cursor to it. */
export function addScannedPage(session: ImportSession, page: ImportPageResult): ImportSession {
  return { ...session, pages: [...session.pages, page], currentPageIndex: session.pages.length };
}

/** Replaces the page at `pageIndex` (e.g. after any of the pure edits above) — session-level counterpart, since ImportPageResult itself never knows its own index. */
export function updatePageAt(session: ImportSession, pageIndex: number, page: ImportPageResult): ImportSession {
  return { ...session, pages: session.pages.map((p, i) => (i === pageIndex ? page : p)) };
}

/** Marks the page at `pageIndex` confirmed — does not itself commit anything; see the commit flow in import-client.tsx. */
export function confirmPageAt(session: ImportSession, pageIndex: number): ImportSession {
  return updatePageAt(session, pageIndex, { ...session.pages[pageIndex], confirmed: true });
}
