/**
 * Manual-correction / reviewability support at the data-model level only —
 * pure functions that derive a new `ScanResult` from reviewer input. No
 * UI, no persistence: a future feature's own state (React state, or a
 * React-Query-backed store if/when persistence is added) calls these to
 * compute the next value and owns holding onto it, exactly like every
 * other domain in this app keeps its own store separate from its pure
 * derivation logic (e.g. src/lib/pc/selectors.ts).
 */
import { computeNeedsReview } from "./confidence";
import type { DetectedCard, ScanResult } from "./types";
import type { IdentificationStrategy } from "./identify/types";
import { getDefaultIdentificationStrategy } from "./identify";

function requireCard(scanResult: ScanResult, cardIndex: number): DetectedCard {
  const card = scanResult.cards[cardIndex];
  if (!card) {
    throw new Error(`No card at index ${cardIndex} in scan result ${scanResult.scanResultId}`);
  }
  return card;
}

function replaceCard(scanResult: ScanResult, cardIndex: number, next: DetectedCard): ScanResult {
  return {
    ...scanResult,
    cards: scanResult.cards.map((card, index) => (index === cardIndex ? next : card)),
  };
}

/**
 * Returns a new ScanResult with `cards[cardIndex].selectedCandidateId` set
 * to `newCandidateId`. Throws if `newCandidateId` isn't one of that card's
 * offered `candidates` — a reviewer shouldn't be able to select a
 * candidate that was never offered. A human's explicit pick always clears
 * `needsReview`, regardless of the pipeline's own confidence classification
 * (a person just confirmed the card). Pure: returns a new object, never
 * mutates the input.
 */
export function applyManualCorrection(
  scanResult: ScanResult,
  cardIndex: number,
  newCandidateId: string
): ScanResult {
  const card = requireCard(scanResult, cardIndex);
  const isOfferedCandidate = card.candidates.some((c) => c.catalogItemId === newCandidateId);
  if (!isOfferedCandidate) {
    throw new Error(
      `Candidate ${newCandidateId} was not among the offered candidates for card ${card.cardId}`
    );
  }

  return replaceCard(scanResult, cardIndex, {
    ...card,
    selectedCandidateId: newCandidateId,
    needsReview: false,
  });
}

/**
 * Marks a detected region as deliberately skipped by a reviewer, without
 * picking a candidate — distinct from an error (a human decision, not a
 * failure). `selectedCandidateId` is left untouched (a reviewer might skip
 * after already picking, or without ever picking). `needsReview` becomes
 * false: a skipped card is, by definition, no longer awaiting review.
 */
export function markCardSkipped(scanResult: ScanResult, cardIndex: number): ScanResult {
  const card = requireCard(scanResult, cardIndex);
  return replaceCard(scanResult, cardIndex, { ...card, skipped: true, needsReview: false });
}

/**
 * Reverses `markCardSkipped`, recomputing `needsReview` from the card's
 * existing `confidenceLevel`/`identificationStatus` (the same rule
 * pipeline.ts used when it first assembled this card).
 */
export function unskipCard(scanResult: ScanResult, cardIndex: number): ScanResult {
  const card = requireCard(scanResult, cardIndex);
  return replaceCard(scanResult, cardIndex, {
    ...card,
    skipped: false,
    needsReview: computeNeedsReview(card.confidenceLevel, card.identificationStatus),
  });
}

/**
 * Re-runs identification only (via `strategy`, defaulting to
 * `getDefaultIdentificationStrategy()`) for `cards[cardIndex]`, using its
 * existing `croppedImage` — does NOT re-run detection/cropping. For "the
 * AI misread this, try again" or "try again now that GEMINI_API_KEY is
 * configured". Unlike the other corrections above, this is async (it calls
 * the strategy) and does not itself compute a new `confidenceLevel` —
 * callers wanting the pipeline's full confidence classification should
 * reuse `classifyConfidence`/`computeNeedsReview` from `./confidence.ts`
 * the same way `pipeline.ts` does; this function updates only the fields
 * an identification call itself produces.
 */
export async function retryIdentification(
  scanResult: ScanResult,
  cardIndex: number,
  strategy: IdentificationStrategy = getDefaultIdentificationStrategy()
): Promise<ScanResult> {
  const card = requireCard(scanResult, cardIndex);
  const output = await strategy.identify({ croppedImage: card.croppedImage });

  return replaceCard(scanResult, cardIndex, {
    ...card,
    identificationStatus: output.status,
    identificationConfidence: output.identificationConfidence,
    candidates: output.candidates,
    error: output.error,
  });
}
