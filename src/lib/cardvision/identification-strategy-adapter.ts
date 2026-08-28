/**
 * Adapts a CardVisionRecognizer into the scanning engine's
 * `IdentificationStrategy` interface (src/lib/scanning/identify/types.ts),
 * so CardVision can eventually be dropped into `runScanPipeline({
 * identificationStrategy })` and used by the Mass Card Scanner / Binder
 * Import with ZERO changes to either feature — this is what requirement
 * #10 of the CardVision brief means by "make it possible for CardVision to
 * become another provider later" via the recognition-provider abstraction
 * that already exists.
 *
 * Not wired into any route/default in this phase (see
 * src/lib/scanning/identify/index.ts's getDefaultIdentificationStrategy,
 * left untouched) — this file exists to prove the seam works, not to
 * switch production behavior.
 */
import type { IdentificationInput, IdentificationOutput, IdentificationStrategy } from "@/lib/scanning/identify/types";
import type { CandidateMatch } from "@/lib/scanning";
import type { CardVisionRecognizer } from "./recognizer";
import type { CardPosition, RecognitionCandidate } from "./types";

function toCandidateMatch(candidate: RecognitionCandidate): CandidateMatch {
  return {
    catalogItemId: candidate.catalogItemId,
    gameId: candidate.gameId,
    name: candidate.name,
    setName: candidate.setName,
    number: candidate.number,
    imageSmallUrl: candidate.imageSmallUrl,
    score: candidate.score,
  };
}

export function toIdentificationStrategy(recognizer: CardVisionRecognizer): IdentificationStrategy {
  return {
    id: `${recognizer.id}-as-identification-strategy`,
    async identify(input: IdentificationInput): Promise<IdentificationOutput> {
      if (!input.croppedImage) {
        return { status: "unidentified", identificationConfidence: 0, candidates: [], error: null };
      }

      // A synthetic, single-card position — this adapter is called once
      // per already-detected card by the scanning engine's pipeline.ts, so
      // index/row/column/page carry no meaningful value here; the pocket
      // mapping happens downstream (see src/lib/scanning/geometry.ts's
      // mapCardsToGrid), not inside identification.
      const position: CardPosition = {
        imageId: "identification-strategy-adapter",
        index: 0,
        row: null,
        column: null,
        page: null,
        boundingBox: input.boundingBox ?? {
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          centerX: 0.5,
          centerY: 0.5,
          rotation: 0,
        },
      };

      const result = await recognizer.recognize({ image: input.croppedImage, position, gameHint: input.gameHint });

      if (result.status === "error") {
        return { status: "error", identificationConfidence: 0, candidates: [], error: result.error };
      }

      // The scanning engine's IdentificationStatus has no direct
      // "recognized with high confidence" value of its own — pipeline.ts
      // derives its own ConfidenceLevel from `identificationConfidence`
      // and `candidates`, so "identified" vs "ambiguous" is left to that
      // downstream classification rather than duplicated here. A
      // CardVision result with any candidates is reported as "ambiguous"
      // (never auto-"identified") so pipeline.ts's own confidence
      // classification — not this adapter — decides whether a human needs
      // to look, consistent with "never assume the first prediction is
      // correct".
      return {
        status: result.candidates.length > 0 ? "ambiguous" : "unidentified",
        identificationConfidence: result.confidence,
        candidates: result.candidates.map(toCandidateMatch),
        error: null,
      };
    },
  };
}
