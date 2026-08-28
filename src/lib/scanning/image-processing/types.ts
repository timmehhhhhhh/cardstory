/**
 * Image preprocessing (crop / orientation / perspective correction) is
 * kept behind this interface so the implementation can later swap between
 * browser-side, server-side, local, or an external vision service without
 * rewriting the pipeline or either consumer feature. See
 * server-image-processor.ts for this phase's concrete (partial)
 * implementation and its documented limitations.
 */
import type { BoundingBox, ImageRef } from "../types";

export interface ImageProcessor {
  readonly id: string;
  /** Produces a cropped ImageRef for one detected region's box, from the original image. */
  crop(
    image: ImageRef,
    box: BoundingBox,
    imagePixelWidth?: number,
    imagePixelHeight?: number
  ): Promise<ImageRef>;
  /** Best-effort: rotates a crop to present the card upright at the given orientation. */
  correctOrientation(image: ImageRef, orientation: 0 | 90 | 180 | 270): Promise<ImageRef>;
  /** Corrects keystone/perspective distortion for a card photographed at an angle, given its detected box. */
  correctPerspective(image: ImageRef, box: BoundingBox): Promise<ImageRef>;
}
