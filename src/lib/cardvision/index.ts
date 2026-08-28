/**
 * Public entrypoint for CardVision — mirrors src/lib/scanning/index.ts's
 * intentional-barrel convention: the consumer-facing surface only.
 * Internal seams (providers/*, pipeline/*, reference-index.ts, telemetry.ts)
 * stay directly importable for tests or a caller wanting to inject a
 * custom implementation, but aren't re-exported here to keep this barrel's
 * surface intentional.
 *
 * CardVision does not replace src/lib/scanning's default recognition path
 * in this phase — see docs/cardvision.md.
 */
export { createCardVisionRecognizer } from "./recognizer";
export type { CardVisionRecognizer, CardVisionRecognizerConfig } from "./recognizer";

export { toIdentificationStrategy } from "./identification-strategy-adapter";

export { classifyRecognitionConfidence, computeRecognitionNeedsReview } from "./confidence";

export { isCardVisionEnabled, isCardVisionDebug, getCardVisionProvider, getDefaultCardVisionRecognizer } from "./config";

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
