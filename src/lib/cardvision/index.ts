/**
 * Public entrypoint for CardVision — mirrors src/lib/scanning/index.ts's
 * intentional-barrel convention: the consumer-facing surface only.
 * Internal seams (providers/*, pipeline/*, reference-image-fetch.ts,
 * telemetry.ts) stay directly importable for tests or a caller wanting to
 * inject a custom implementation, but aren't re-exported here to keep
 * this barrel's surface intentional.
 *
 * CardVision does not replace src/lib/scanning's default recognition path
 * in this phase — see docs/cardvision.md.
 */
export { createCardVisionRecognizer } from "./recognizer";
export type { CardVisionRecognizer, CardVisionRecognizerConfig } from "./recognizer";

export { toIdentificationStrategy } from "./identification-strategy-adapter";

export { classifyRecognitionConfidence, computeRecognitionNeedsReview } from "./confidence";

export { isCardVisionEnabled, isCardVisionDebug, getCardVisionProvider, getDefaultCardVisionRecognizer } from "./config";

// Phase 2: the real reference-image indexer (see reference-index.ts) —
// exported here since scripts/reindex-cardvision-references.ts is the
// first real external caller, and should use the intentional public
// surface rather than reaching into the internal file directly.
export { catalogReferenceIndexer } from "./reference-index";
export type { CardReferenceIndexer, CardReferenceRecord, IndexStatus, IndexRebuildResult } from "./reference-index";

export type {
  CardPosition,
  MultiCardRecognitionResult,
  OcrReading,
  RecognitionCandidate,
  RecognitionConfidenceLevel,
  RecognitionMetadata,
  RecognitionResult,
  RecognitionStatus,
} from "./types";
