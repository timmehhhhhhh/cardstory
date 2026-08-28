/**
 * The one Workers-safe implementation of ImageProcessor for this phase —
 * deliberately partial, with the gaps documented rather than papered over.
 *
 * No native/binary image-processing library (sharp, libvips, OpenCV, ...)
 * runs in Cloudflare Workers under this app's OpenNext deployment (see
 * wrangler.jsonc / the Workers size-cap comments in src/lib/scan/gemini.ts
 * for the same constraint on a different dependency). Introducing one as a
 * hard dependency of this engine would make it unusable in production, so:
 *
 * - `crop` does NOT crop pixels server-side. It returns the original
 *   `image` unchanged. Callers get real per-card crops either by (a)
 *   cropping client-side via <canvas> before calling the pipeline —
 *   mirroring the existing resize-before-send pattern in
 *   src/app/scan/_components/capture-upload.tsx — and passing already-
 *   cropped ImageRefs in per detected region, or (b) accepting an
 *   uncropped full-image reference per DetectedCard for this phase, with
 *   `boundingBox` telling a future UI which part of the photo it
 *   corresponds to. Real server-side cropping is left to a future
 *   external-vision-service-backed implementation of this same interface.
 * - `correctOrientation` only ever returns the image unchanged with the
 *   orientation recorded — no actual pixel rotation happens server-side,
 *   for the same reason.
 * - `correctPerspective` is a pure pass-through stub — no keystone/
 *   perspective correction is implemented. A card photographed at an
 *   angle is identified from its as-shot crop as-is.
 */
import type { ImageRef } from "../types";
import type { ImageProcessor } from "./types";

// `box`/`orientation` are intentionally unused below — every method here is
// a documented pass-through stub (see file header) — so they're omitted
// from the implementation signatures entirely rather than named-and-ignored
// (TS structurally satisfies ImageProcessor with fewer positional params).
export const serverImageProcessor: ImageProcessor = {
  id: "server-passthrough",

  async crop(image: ImageRef): Promise<ImageRef> {
    return image;
  },

  async correctOrientation(image: ImageRef): Promise<ImageRef> {
    return image;
  },

  async correctPerspective(image: ImageRef): Promise<ImageRef> {
    return image;
  },
};
