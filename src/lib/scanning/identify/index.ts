import type { IdentificationStrategy } from "./types";
import { createClaudeIdentificationStrategy } from "./claude-identification";

export type { IdentificationInput, IdentificationOutput, IdentificationStrategy } from "./types";
export { createClaudeIdentificationStrategy } from "./claude-identification";
export { rankCandidates, rankCatalogItems } from "./rank-candidates";

/**
 * The default identification strategy. Unlike detection, there's no
 * "no-op identification" fallback the way detection has
 * singleRegionDetector — an unidentified card is itself a valid,
 * representable IdentificationOutput (status: "unidentified"), not a
 * pipeline failure needing a stand-in strategy.
 */
export function getDefaultIdentificationStrategy(): IdentificationStrategy {
  return createClaudeIdentificationStrategy();
}
