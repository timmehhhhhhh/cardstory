/**
 * The `IdentificationStrategy` pluggability seam: identifying one already-
 * detected/cropped card is kept behind this interface, layered as
 * visual/OCR evidence -> catalog metadata -> set/number relationships ->
 * candidate ranking -> confidence, per the concrete implementation in
 * ./gemini-identification.ts and ./rank-candidates.ts.
 */
import type { BoundingBox, CandidateMatch, Confidence, IdentificationStatus, ImageRef } from "../types";

export interface IdentificationInput {
  croppedImage: ImageRef | null;
  /**
   * Optional hint from a caller who already knows the game (e.g. Binder
   * Import scanning a known-Pokémon binder) — narrows catalog search the
   * same way `ScanIdentification.gameGuess` narrows
   * src/lib/scan/match.ts's `matchCandidates` today.
   */
  gameHint?: string;
  /**
   * The detected region within the *source* photo this crop is supposed to
   * be. Since ImageProcessor.crop is currently a pass-through (see
   * server-image-processor.ts), `croppedImage` for every card in one photo
   * is byte-identical — this is the only per-card signal an identification
   * strategy has to tell cards in the same photo apart. A strategy that can
   * use it (e.g. gemini-identification.ts, via RegionHint) should; one that
   * can't is free to ignore it.
   */
  boundingBox?: BoundingBox;
}

export interface IdentificationOutput {
  status: IdentificationStatus;
  identificationConfidence: Confidence;
  /** Ranked, highest score first. */
  candidates: CandidateMatch[];
  error: string | null;
}

export interface IdentificationStrategy {
  readonly id: string;
  identify(input: IdentificationInput): Promise<IdentificationOutput>;
}
