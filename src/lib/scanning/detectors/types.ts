/**
 * The `CardDetector` pluggability seam: card detection is kept behind this
 * interface so the concrete implementation (browser-side, server-side,
 * local, or an external vision service) can be swapped without touching
 * the pipeline or either future consumer feature.
 */
import type { ImageRef } from "../types";
import type { RawBox } from "../geometry";

/** One region a detector believes contains a physical card, before normalization/ordering. */
export interface DetectionRegion {
  /** Detector-reported box — may be pixel-space or already normalized; see geometry.ts's normalizeBoundingBox. */
  box: RawBox;
  /** Detector's own confidence this region is a real card, 0..1. */
  confidence: number;
}

export interface DetectionInput {
  image: ImageRef;
  /**
   * Pixel dimensions of `image`, when known — lets normalizeBoundingBox
   * convert detector-reported pixel/relative coordinates consistently
   * across detector implementations. Optional: a detector that only ever
   * reports pre-normalized [0,1] coordinates can ignore these.
   */
  imagePixelWidth?: number;
  imagePixelHeight?: number;
}

export interface CardDetector {
  /** Human-readable id for logging/telemetry, e.g. "claude-multi-region" or "single-region-fallback". */
  readonly id: string;
  detect(input: DetectionInput): Promise<DetectionRegion[]>;
}
