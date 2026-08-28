/**
 * Phase-1 scaffold CandidateRanker: a fixed-weight, deterministic
 * combination of each candidate's per-signal scores into an overall
 * `score`. Deliberately NOT machine-learned — the CardVision brief asks
 * for "a deterministic/scaffold implementation that makes it obvious where
 * future ranking logic will live", not sophisticated ranking yet. A future
 * phase can replace this with a learned ranker (e.g. trained on the
 * telemetry captured via ./telemetry.ts) as long as it implements the same
 * CandidateRanker interface.
 *
 * Weights are named constants (not inlined) for the same reason
 * src/lib/scanning/confidence.ts's thresholds are — visible, testable
 * boundary behavior, and a single place a future tuning pass touches.
 */
import type { RecognitionCandidate } from "../types";
import type { CandidateRanker } from "./types";

// Sums to 1 across the three signals a candidate MAY have — a candidate
// missing one or more signals (the common Phase-1 case, since
// visualSimilarity is always null) is rescored proportionally over only
// its available signals rather than penalized for a missing signal, so a
// text-only retriever's candidates aren't silently deflated relative to a
// future retriever that supplies all three.
const VISUAL_SIMILARITY_WEIGHT = 0.5;
const OCR_WEIGHT = 0.35;
const METADATA_WEIGHT = 0.15;

interface WeightedSignal {
  value: number | null;
  weight: number;
}

/** Weighted average over only the signals that are present (non-null); null (no signals present) means "nothing to score from". */
function combineSignals(signals: WeightedSignal[]): number | null {
  const present = signals.filter((s): s is { value: number; weight: number } => s.value != null);
  if (present.length === 0) return null;
  const totalWeight = present.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return null;
  const weightedSum = present.reduce((sum, s) => sum + s.value * s.weight, 0);
  return weightedSum / totalWeight;
}

function scoreCandidate(candidate: RecognitionCandidate): number {
  const combined = combineSignals([
    { value: candidate.visualSimilarity, weight: VISUAL_SIMILARITY_WEIGHT },
    { value: candidate.ocrScore, weight: OCR_WEIGHT },
    { value: candidate.metadataScore, weight: METADATA_WEIGHT },
  ]);
  // No per-signal evidence at all (e.g. a retriever that only ever sets
  // `score`, not the individual signal fields) — fall back to the
  // candidate's own retrieval score rather than producing a 0, which would
  // wrongly read as "confidently wrong" instead of "no breakdown available".
  return combined ?? candidate.score;
}

// `evidence` is intentionally unused today (no ranking signal currently
// reads outside a candidate's own fields) — omitted from the implementation
// signature entirely, same TS-structural-typing convention as
// null-embedding-provider.ts.
export const deterministicCandidateRanker: CandidateRanker = {
  id: "cardvision-deterministic-ranker",
  rank(candidates: RecognitionCandidate[]): RecognitionCandidate[] {
    return candidates
      .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate) }))
      .sort((a, b) => b.score - a.score);
  },
};
