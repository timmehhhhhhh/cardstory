/**
 * The trivial "whole-image-is-one-card" fallback: always available (no
 * external dependency, no API key required), used when
 * createClaudeCardDetector() returns null (no ANTHROPIC_API_KEY configured),
 * or as an explicit choice for a caller who already knows the photo shows
 * exactly one card (e.g. the existing single-card manual Scan feature's
 * use case, if it were ever ported onto this engine).
 */
import type { CardDetector, DetectionRegion } from "./types";

/** No real detection signal, so a fixed, documented neutral confidence rather than a fabricated high number. */
const NEUTRAL_CONFIDENCE = 0.5;

export const singleRegionDetector: CardDetector = {
  id: "single-region-fallback",
  async detect(): Promise<DetectionRegion[]> {
    return [
      {
        box: { x: 0, y: 0, width: 1, height: 1 },
        confidence: NEUTRAL_CONFIDENCE,
      },
    ];
  },
};
