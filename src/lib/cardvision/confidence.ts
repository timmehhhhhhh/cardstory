/**
 * Pure confidence-state classification for a CardVision RecognitionResult.
 * Kept separate from the recognizer/providers so it's trivially unit-tested
 * with plain numbers — mirrors src/lib/scanning/confidence.ts's structure
 * and rationale exactly, but classifies CardVision's own
 * `RecognitionConfidenceLevel` rather than the scanning engine's
 * `ConfidenceLevel`, since the two systems score different signals (see
 * types.ts's RecognitionConfidenceLevel doc comment).
 */
import type { RecognitionConfidenceLevel, RecognitionStatus } from "./types";

export interface RecognitionConfidenceInput {
  /** candidates[0].score, or 0 when there are no candidates. */
  topScore: number;
  /** candidates[0].score - candidates[1].score, or candidates[0].score when there's only one candidate, or 0 when there are none. */
  topCandidateSeparation: number;
  candidateCount: number;
}

// Thresholds are intentionally named constants (not inlined) so tests can
// assert the exact boundary values directly, and so a future
// CARDVISION_* env var can override them in one place without touching the
// classification logic itself.
const HIGH_SCORE_MIN = 0.75;
const HIGH_SEPARATION_MIN = 0.15;

const NEEDS_REVIEW_SCORE_MIN = 0.5;

const LOW_CONFIDENCE_SCORE_MIN = 0.2;

/**
 * Pure classification of a recognition's overall confidence from its
 * ranked-candidate scores.
 *
 * - UNIDENTIFIED: no candidates at all, or the top score doesn't clear even
 *   the low-confidence floor.
 * - HIGH_CONFIDENCE: a standout top candidate — score AND separation from
 *   the runner-up both clear their thresholds. The only level requirement
 *   #7 allows a future auto-import policy to act on without a human.
 * - NEEDS_REVIEW: a plausible top candidate, but not a clear standout
 *   (either the score is merely decent, or a HIGH-scoring top candidate
 *   has a close runner-up worth a human glance).
 * - LOW_CONFIDENCE: a candidate exists but is too weak to present as a
 *   likely match — requires the user to identify the card themselves.
 */
export function classifyRecognitionConfidence(input: RecognitionConfidenceInput): RecognitionConfidenceLevel {
  const { topScore, topCandidateSeparation, candidateCount } = input;

  if (candidateCount === 0 || topScore < LOW_CONFIDENCE_SCORE_MIN) {
    return "UNIDENTIFIED";
  }

  if (topScore >= HIGH_SCORE_MIN && topCandidateSeparation >= HIGH_SEPARATION_MIN) {
    return "HIGH_CONFIDENCE";
  }

  if (topScore >= NEEDS_REVIEW_SCORE_MIN) {
    return "NEEDS_REVIEW";
  }

  return "LOW_CONFIDENCE";
}

/**
 * Whether a recognition still needs a human look before a feature acts on
 * it. True for every non-HIGH_CONFIDENCE level, and defensively true for
 * any non-"recognized"/non-"pending" status even if confidenceLevel were
 * somehow HIGH_CONFIDENCE — same defensive pattern as
 * src/lib/scanning/confidence.ts's computeNeedsReview.
 */
export function computeRecognitionNeedsReview(
  confidenceLevel: RecognitionConfidenceLevel,
  status: RecognitionStatus
): boolean {
  if (confidenceLevel !== "HIGH_CONFIDENCE") return true;
  return status !== "recognized";
}
