import type { CardDetector } from "./types";
import { createClaudeCardDetector } from "./claude-detector";
import { singleRegionDetector } from "./single-region-detector";

export type { CardDetector, DetectionInput, DetectionRegion } from "./types";
export { createClaudeCardDetector } from "./claude-detector";
export { singleRegionDetector } from "./single-region-detector";

/**
 * The one place the detector fallback decision is made: the Claude
 * multi-region detector when ANTHROPIC_API_KEY is configured, else the
 * always-available single-region fallback.
 */
export function getDefaultCardDetector(): CardDetector {
  return createClaudeCardDetector() ?? singleRegionDetector;
}
