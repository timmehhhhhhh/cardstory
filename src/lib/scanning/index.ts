/**
 * Public entrypoint for the card-scanning engine — the shared foundation
 * both the (not-yet-built) Mass Card Scanner and Binder Import features
 * import from. Re-exports the consumer-facing surface only; internal seams
 * (detectors/*, image-processing/*, identify/*) stay directly importable
 * for tests or a caller wanting to inject a custom implementation, but
 * aren't re-exported here to keep this barrel's surface intentional.
 *
 * The engine identifies cards. It never adds cards to a PC
 * (src/lib/pc), never modifies binder positions (src/lib/binder), and
 * never renders any UI — the feature-specific workflow that calls
 * `runScanPipeline` decides what to do with the result.
 */
export { runScanPipeline, runScanPipelineSafe } from "./pipeline";
export type { RunScanPipelineInput } from "./pipeline";

export { applyManualCorrection, markCardSkipped, unskipCard, retryIdentification } from "./corrections";

export type {
  BoundingBox,
  CandidateMatch,
  Confidence,
  ConfidenceLevel,
  DetectedCard,
  DetectedPosition,
  IdentificationStatus,
  ImageRef,
  ScanResult,
  SourceImageId,
} from "./types";
