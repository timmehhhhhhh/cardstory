/**
 * Pure confidence-state classification for a detected card. Kept separate
 * from detection/identification/ranking so it's trivially unit-tested with
 * plain numbers, and so pipeline.ts and corrections.ts (after a manual
 * correction or a retry) call the exact same rule rather than each
 * re-deriving it.
 */
import type { ConfidenceLevel, IdentificationStatus, Confidence } from "./types";

export interface ConfidenceInput {
  detectionConfidence: Confidence;
  identificationConfidence: Confidence;
  /**
   * `candidates[0].score - candidates[1].score`, or `candidates[0].score`
   * when there's only one candidate, or 0 when there are none — the
   * "separation" signal: a single standout match reads as more trustworthy
   * than two near-tied ones even at the same top score.
   */
  topCandidateSeparation: number;
  candidateCount: number;
}

// Thresholds are intentionally named constants (not inlined) so tests can
// assert the exact boundary values directly.
const HIGH_DETECTION_MIN = 0.7;
const HIGH_IDENTIFICATION_MIN = 0.7;
const HIGH_SEPARATION_MIN = 0.15;

const MEDIUM_DETECTION_MIN = 0.4;
const MEDIUM_IDENTIFICATION_MIN = 0.4;

const UNIDENTIFIED_IDENTIFICATION_MAX = 0.2;

/**
 * Pure classification of a detected card's overall confidence.
 *
 * - UNIDENTIFIED: no candidates at all, or identification confidence is at
 *   or below the low-confidence floor even with candidates present (the
 *   catalog match, if any, isn't trustworthy enough to call "identified").
 * - HIGH: detection, identification, AND top-candidate separation all
 *   clear their thresholds — a single standout match on a clean detection.
 * - MEDIUM: detection and identification both clear a lower floor (or HIGH
 *   detection/identification but insufficient separation between the top
 *   two candidates).
 * - LOW: everything else that isn't UNIDENTIFIED.
 */
export function classifyConfidence(input: ConfidenceInput): ConfidenceLevel {
  const { detectionConfidence, identificationConfidence, topCandidateSeparation, candidateCount } =
    input;

  if (candidateCount === 0 || identificationConfidence <= UNIDENTIFIED_IDENTIFICATION_MAX) {
    return "UNIDENTIFIED";
  }

  if (
    detectionConfidence >= HIGH_DETECTION_MIN &&
    identificationConfidence >= HIGH_IDENTIFICATION_MIN &&
    topCandidateSeparation >= HIGH_SEPARATION_MIN
  ) {
    return "HIGH";
  }

  if (detectionConfidence >= MEDIUM_DETECTION_MIN && identificationConfidence >= MEDIUM_IDENTIFICATION_MIN) {
    return "MEDIUM";
  }

  return "LOW";
}

/**
 * Whether a card still needs a human look before a feature acts on it.
 * True for every non-HIGH confidence level, and defensively true for any
 * non-"identified" status even if confidenceLevel were somehow HIGH (e.g.
 * an "ambiguous" status produced by a future identification strategy that
 * doesn't itself lower confidenceLevel).
 */
export function computeNeedsReview(
  confidenceLevel: ConfidenceLevel,
  identificationStatus: IdentificationStatus
): boolean {
  if (confidenceLevel !== "HIGH") return true;
  return identificationStatus !== "identified";
}
