import type { CardDetector } from "./types";
import { createGeminiCardDetector } from "./gemini-detector";
import { singleRegionDetector } from "./single-region-detector";

export type { CardDetector, DetectionInput, DetectionRegion } from "./types";
export { createGeminiCardDetector } from "./gemini-detector";
export { singleRegionDetector } from "./single-region-detector";

/**
 * The one place the detector fallback decision is made: the Gemini
 * multi-region detector when GEMINI_API_KEY is configured, else the
 * always-available single-region fallback.
 */
export function getDefaultCardDetector(): CardDetector {
  return createGeminiCardDetector() ?? singleRegionDetector;
}
