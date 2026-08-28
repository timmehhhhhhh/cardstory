import type { ConfidenceLevel } from "@/lib/scanning";

/**
 * User-facing copy for a DetectedCard's confidenceLevel — the Mass Card
 * Scanner review grid's one source of truth for this wording, so "High
 * confidence" vs "Needs confirmation" never drifts between the grid, the
 * batch-confirm bar, and the completion summary. Deliberately never implies
 * more certainty than the engine actually has (see src/lib/scanning/types.ts
 * DetectedCard.confidenceLevel) — a MEDIUM/LOW/UNIDENTIFIED card must always
 * read as needing a human look, never as a done deal.
 */
export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  HIGH: "High confidence",
  MEDIUM: "Review",
  LOW: "Needs confirmation",
  UNIDENTIFIED: "Couldn't identify",
};
