/**
 * Phase-1 stand-in VisionEmbeddingProvider — no embedding model has been
 * selected or trained yet (see the CardVision brief's explicit "do not
 * prematurely select a specific ML model" instruction). Returning null
 * always makes "no embedding available" a first-class, explicit state
 * threaded through the rest of the pipeline (RecognitionCandidate.
 * visualSimilarity stays null) rather than an unimplemented method a future
 * caller might accidentally invoke and get a misleading zero vector from.
 *
 * A future phase replaces this with a real implementation of the same
 * VisionEmbeddingProvider interface (e.g. backed by CLIP/SigLIP/DINO or a
 * hosted embeddings API) — no other file in this module needs to change.
 */
import type { EmbeddingVector, VisionEmbeddingProvider } from "./types";

// `image` is intentionally unused — every method here is a documented
// no-op stub (see file header) — so it's omitted from the implementation
// signature entirely rather than named-and-ignored (TS structurally
// satisfies VisionEmbeddingProvider with fewer positional params), same
// convention as src/lib/scanning/image-processing/server-image-processor.ts.
export const nullEmbeddingProvider: VisionEmbeddingProvider = {
  id: "cardvision-null-embedding",
  async embed(): Promise<EmbeddingVector | null> {
    return null;
  },
};
