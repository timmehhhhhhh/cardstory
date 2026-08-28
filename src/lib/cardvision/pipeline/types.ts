/**
 * CardVision's preprocessing-pipeline seam: raw image -> validation ->
 * orientation correction -> card detection -> perspective correction ->
 * crop -> normalization -> recognition (see docs/cardvision.md's pipeline
 * diagram). Phase 1 does not build a new detector or a real
 * perspective-correction implementation — it reuses the scanning engine's
 * existing `CardDetector`/`ImageProcessor` (src/lib/scanning/detectors,
 * src/lib/scanning/image-processing) rather than duplicating either
 * interface, and adds only the one genuinely new stage this brief calls
 * for: image validation.
 */
import type { CardDetector } from "@/lib/scanning/detectors/types";
import type { ImageProcessor } from "@/lib/scanning/image-processing/types";
import { getDefaultCardDetector } from "@/lib/scanning/detectors";
import { serverImageProcessor } from "@/lib/scanning/image-processing/server-image-processor";
import type { ImageRef } from "../types";

// Re-exported (not redefined) so a CardVision-specific caller can import
// both this module's own types and the reused scanning-engine types from
// one place without needing to know which file each originally lives in.
export type { CardDetector, ImageProcessor };

export interface ImageValidationResult {
  valid: boolean;
  /** Human-readable reason when `valid` is false, e.g. "unsupported image format" or "image too small to contain a legible card". */
  reason: string | null;
}

/**
 * The one pipeline stage that has no existing scanning-engine equivalent —
 * a future card detector benefits from rejecting obviously-unusable input
 * (corrupt bytes, a 10x10px thumbnail) before spending a detection call on
 * it. No implementation exists yet in Phase 1 (see
 * pass-through-image-validator.ts) beyond a documented always-valid stub.
 */
export interface ImageValidator {
  readonly id: string;
  validate(image: ImageRef): Promise<ImageValidationResult>;
}

/** The full set of pipeline-stage implementations `recognizer.ts` composes — see recognizer.ts's `CardVisionRecognizerConfig`. */
export interface CardVisionPipelineStages {
  validator: ImageValidator;
  detector: CardDetector;
  imageProcessor: ImageProcessor;
}

/**
 * Wires the detection/crop stages to the scanning engine's existing
 * defaults, and the validation stage to Phase 1's always-valid stub — the
 * single place a future real ImageValidator/CardVisionDetector gets
 * substituted in without every caller needing to know the wiring changed.
 */
export function buildCardVisionPipelineDefaults(): CardVisionPipelineStages {
  return {
    validator: passThroughImageValidator,
    detector: getDefaultCardDetector(),
    imageProcessor: serverImageProcessor,
  };
}

/**
 * Always reports `valid: true` — no real validation logic exists yet
 * (format/corruption/size checks are left to a future phase). Documented
 * as a stub rather than silently absent, same convention as
 * src/lib/scanning/image-processing/server-image-processor.ts.
 */
export const passThroughImageValidator: ImageValidator = {
  id: "cardvision-passthrough-validator",
  async validate(): Promise<ImageValidationResult> {
    return { valid: true, reason: null };
  },
};
