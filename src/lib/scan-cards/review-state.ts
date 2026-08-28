/**
 * Pure, feature-local state derivation for the Mass Card Scanner's review
 * grid. Wraps src/lib/scanning's ScanResult/DetectedCard/corrections.ts —
 * never forks their logic — with the review-grid-specific concerns the
 * shared engine deliberately doesn't own: which photo a card came from (for
 * the numbered overlay), whether it's checked for the batch write, and
 * mapping a confirmed selection into a PC Holding row.
 *
 * No React here — src/app/scan/_components/scan-client.tsx is the only
 * caller, and it's the one place these functions' results get held in
 * component state.
 */
import {
  applyManualCorrection,
  markCardSkipped,
  unskipCard,
  type CandidateMatch,
  type DetectedCard,
  type ScanResult,
} from "@/lib/scanning";
import type { NewHoldingInput } from "@/lib/pc/types";
import { getGameMeta } from "@/lib/games/registry";

/** One reviewable card in the flat grid, tying a DetectedCard back to the photo it came from. */
export interface ReviewItem {
  /** `${scanResultId}:${cardId}` — stable React key and lookup key for every function below. */
  key: string;
  scanResultId: string;
  sourceImageId: string;
  /** The photo this card was detected in — an object URL/data URL the UI already has client-side. */
  sourcePreviewUrl: string;
  card: DetectedCard;
  /** Checked for inclusion in the next "Add N cards" commit. Distinct from `card.skipped`/`needsReview` — a reviewer can uncheck a HIGH-confidence card without marking it skipped. */
  includeInBatch: boolean;
}

/** One photo's ScanResult plus the preview URL the UI rendered it from — the input buildReviewItems flattens. */
export interface ScannedPhoto {
  previewUrl: string;
  result: ScanResult;
}

function requireItem(items: ReviewItem[], key: string): { item: ReviewItem; index: number } {
  const index = items.findIndex((i) => i.key === key);
  if (index === -1) throw new Error(`No review item with key ${key}`);
  return { item: items[index], index };
}

/** True when a card should arrive pre-checked and pre-selected: the pipeline is fully confident AND actually identified something (see src/lib/scanning/confidence.ts). */
function isAutoAcceptable(card: DetectedCard): boolean {
  return card.confidenceLevel === "HIGH" && card.identificationStatus === "identified" && card.candidates.length > 0;
}

/**
 * Flattens one or more photos' ScanResults into a single ordered
 * ReviewItem[] — photo order preserved, and within each photo the engine's
 * own reading-order (card.detectedPosition.index) preserved. HIGH-confidence
 * identified cards are auto-selected onto their top candidate here (via the
 * engine's own applyManualCorrection, so the "candidate must be offered"
 * invariant still holds) and pre-checked; everything else starts unchecked,
 * requiring a reviewer's explicit action before it can be committed.
 */
export function buildReviewItems(photos: ScannedPhoto[]): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const photo of photos) {
    let result = photo.result;
    const orderedCards = [...result.cards].sort(
      (a, b) => a.detectedPosition.index - b.detectedPosition.index
    );
    for (const card of orderedCards) {
      const cardIndex = result.cards.findIndex((c) => c.cardId === card.cardId);
      let finalCard = card;
      if (isAutoAcceptable(card)) {
        result = applyManualCorrection(result, cardIndex, card.candidates[0].catalogItemId);
        finalCard = result.cards[cardIndex];
      }
      items.push({
        key: `${result.scanResultId}:${finalCard.cardId}`,
        scanResultId: result.scanResultId,
        sourceImageId: finalCard.sourceImageId,
        sourcePreviewUrl: photo.previewUrl,
        card: finalCard,
        includeInBatch: isAutoAcceptable(finalCard),
      });
    }
  }
  return items;
}

/** Toggles one item's batch-inclusion checkbox — independent of skip/candidate state. */
export function toggleInclude(items: ReviewItem[], key: string): ReviewItem[] {
  const { index } = requireItem(items, key);
  return items.map((item, i) => (i === index ? { ...item, includeInBatch: !item.includeInBatch } : item));
}

/**
 * Applies a reviewer's manual pick. `candidate` need not be among the
 * card's originally offered candidates (e.g. a "Change card" search result)
 * — it's appended first so corrections.ts's applyManualCorrection (which
 * requires an offered candidate) still accepts it. Re-selecting always
 * re-checks the item for the batch: a human just confirmed this card.
 */
export function setCandidate(items: ReviewItem[], key: string, candidate: CandidateMatch): ReviewItem[] {
  const { item, index } = requireItem(items, key);
  const scanResult: ScanResult = { ...emptyScanResultShell(item), cards: [item.card] };
  const alreadyOffered = item.card.candidates.some((c) => c.catalogItemId === candidate.catalogItemId);
  const withCandidate = alreadyOffered
    ? scanResult
    : { ...scanResult, cards: [{ ...item.card, candidates: [candidate, ...item.card.candidates] }] };

  const corrected = applyManualCorrection(withCandidate, 0, candidate.catalogItemId);
  const nextCard = corrected.cards[0];
  return items.map((it, i) => (i === index ? { ...it, card: nextCard, includeInBatch: true } : it));
}

/** Marks an item skipped (excluded from batch counts) — mirrors corrections.ts's markCardSkipped. */
export function skipItem(items: ReviewItem[], key: string): ReviewItem[] {
  const { item, index } = requireItem(items, key);
  const scanResult: ScanResult = { ...emptyScanResultShell(item), cards: [item.card] };
  const nextCard = markCardSkipped(scanResult, 0).cards[0];
  return items.map((it, i) => (i === index ? { ...it, card: nextCard, includeInBatch: false } : it));
}

/** Reverses skipItem — mirrors corrections.ts's unskipCard. Does not re-check the item; a reviewer still opts back in explicitly. */
export function unskipItem(items: ReviewItem[], key: string): ReviewItem[] {
  const { item, index } = requireItem(items, key);
  const scanResult: ScanResult = { ...emptyScanResultShell(item), cards: [item.card] };
  const nextCard = unskipCard(scanResult, 0).cards[0];
  return items.map((it, i) => (i === index ? { ...it, card: nextCard } : it));
}

/** Replaces one item's card wholesale — used after a server-side "Retry identification" round trip returns a fresh DetectedCard for this key. */
export function replaceCard(items: ReviewItem[], key: string, nextCard: DetectedCard): ReviewItem[] {
  const { index } = requireItem(items, key);
  return items.map((it, i) => (i === index ? { ...it, card: nextCard } : it));
}

/** A throwaway single-card ScanResult wrapper so corrections.ts's ScanResult-shaped pure functions can operate on one ReviewItem's card without the caller re-deriving scanResultId/createdAt. */
function emptyScanResultShell(item: ReviewItem): Omit<ScanResult, "cards"> {
  return { scanResultId: item.scanResultId, sourceImageId: item.sourceImageId, createdAt: "", error: null };
}

export interface BatchSummary {
  detected: number;
  skipped: number;
  highConfidence: number;
  needsReview: number;
  /** Checked, not skipped, and has a selectedCandidateId — actually committable. */
  readyToCommit: number;
  /** Of those ready to commit, how many are still flagged needsReview — committing these requires the UI's explicit "Add anyway" step. */
  readyButNeedsReview: number;
}

export function computeBatchSummary(items: ReviewItem[]): BatchSummary {
  const active = items.filter((i) => !i.card.skipped);
  const ready = active.filter((i) => i.includeInBatch && i.card.selectedCandidateId);
  return {
    detected: items.length,
    skipped: items.length - active.length,
    highConfidence: active.filter((i) => i.card.confidenceLevel === "HIGH").length,
    needsReview: active.filter((i) => i.card.needsReview).length,
    readyToCommit: ready.length,
    readyButNeedsReview: ready.filter((i) => i.card.needsReview).length,
  };
}

/** Defaults applied to every scanned card's new Holding — condition/language/currency the AddHoldingDialog would otherwise ask for one-by-one; a reviewer can still fix any of these afterward via the normal Edit Holding dialog once it's in their PC. */
export interface HoldingDefaults {
  language: NewHoldingInput["language"];
  costBasisCurrency: NewHoldingInput["costBasisCurrency"];
}

/**
 * Maps every checked, non-skipped, candidate-selected item into a Holding
 * write — one row per detected card, quantity 1 each. Three identical
 * scanned Pikachus become three separate items here (this app's existing
 * convention: duplicates are separate rows, summed for display — see
 * src/components/cards/card-tile.tsx's ownedQuantity — never merged into
 * one row's quantity). `id` is generated by the caller (crypto.randomUUID
 * client-side) so the batch write is idempotent on retry.
 */
export function toHoldingInputs(
  items: ReviewItem[],
  defaults: HoldingDefaults,
  makeId: () => string
): (NewHoldingInput & { id: string })[] {
  return items
    .filter((i) => i.includeInBatch && !i.card.skipped && i.card.selectedCandidateId)
    .map((i) => {
      const candidate = i.card.candidates.find((c) => c.catalogItemId === i.card.selectedCandidateId);
      // CandidateMatch.gameId is the games-registry id either way (a TCG id
      // like "pokemon"/"riftbound", or a sports registry id) — the same
      // getGameMeta(...).kind distinction every other call site in this app
      // uses (see e.g. card-tile.tsx, selectors.ts) to tell a TCG row from a
      // sports row, so this reuses it rather than guessing at gameId's shape.
      const kind: NewHoldingInput["kind"] =
        candidate?.gameId && getGameMeta(candidate.gameId)?.kind === "sports" ? "sports" : "tcg";
      return {
        id: makeId(),
        kind,
        catalogItemId: kind === "tcg" ? (i.card.selectedCandidateId ?? undefined) : undefined,
        sportsCardItemId: kind === "sports" ? (i.card.selectedCandidateId ?? undefined) : undefined,
        quantity: 1,
        condition: "raw",
        language: defaults.language,
        costBasisTotal: 0,
        costBasisCurrency: defaults.costBasisCurrency,
        acquiredAt: null,
        // No ACQUISITION_METHODS value means "scanned into a Mass Card
        // Scanner batch" — left unset (shows as "Not set" in Edit Holding)
        // rather than inventing a value the shared enum doesn't have.
      };
    });
}
