/**
 * The "visual evidence -> OCR/text evidence" layers of the identification
 * strategy for one cropped card, wrapping `identifyCardFromImage` from
 * src/lib/scan/claude.ts verbatim (that function already does single-card
 * visual+text reading — no fork), then feeding its result into
 * `rankCandidates` for the "catalog metadata -> set/number relationships ->
 * candidate ranking" layers.
 */
import { identifyCardFromImage } from "@/lib/scan/claude";
import type { IdentificationInput, IdentificationOutput, IdentificationStrategy } from "./types";
import { rankCandidates } from "./rank-candidates";

/** Below this, a returned candidate list isn't trustworthy enough to call "identified" even if candidates exist. */
const UNIDENTIFIED_CONFIDENCE_FLOOR = 0.2;

export function createClaudeIdentificationStrategy(): IdentificationStrategy {
  return {
    id: "claude-visual-text",
    async identify(input: IdentificationInput): Promise<IdentificationOutput> {
      if (!input.croppedImage) {
        return { status: "unidentified", identificationConfidence: 0, candidates: [], error: null };
      }
      if (input.croppedImage.kind !== "inline") {
        return {
          status: "error",
          identificationConfidence: 0,
          candidates: [],
          error: "claude-visual-text strategy requires an inline ImageRef",
        };
      }

      try {
        const identification = await identifyCardFromImage(
          input.croppedImage.base64,
          input.croppedImage.mimeType,
          input.boundingBox
        );

        // Graceful degradation (no ANTHROPIC_API_KEY configured) is not a
        // failure — it's an unidentified card, same as the existing
        // single-card Scan feature's "fall back to manual search" convention.
        if (!identification) {
          return { status: "unidentified", identificationConfidence: 0, candidates: [], error: null };
        }
        if (!identification.cardName) {
          return { status: "unidentified", identificationConfidence: identification.confidence, candidates: [], error: null };
        }

        const gameId =
          input.gameHint ??
          (identification.gameGuess && identification.gameGuess !== "other" ? identification.gameGuess : null);

        const candidates = await rankCandidates({
          cardName: identification.cardName,
          cardNumber: identification.cardNumber,
          setNameOrSymbol: identification.setNameOrSymbol,
          gameId,
        });

        // This layer only distinguishes "found at least one plausible
        // candidate" from "found nothing trustworthy" — whether multiple
        // close candidates make the result "ambiguous" is a confidence-
        // separation judgment the pipeline makes (see pipeline.ts), since
        // it already computes topCandidateSeparation for classifyConfidence
        // and shouldn't be duplicated here.
        const status =
          candidates.length === 0 || identification.confidence <= UNIDENTIFIED_CONFIDENCE_FLOOR
            ? "unidentified"
            : "identified";

        return {
          status,
          identificationConfidence: identification.confidence,
          candidates,
          error: null,
        };
      } catch (err) {
        return {
          status: "error",
          identificationConfidence: 0,
          candidates: [],
          error: err instanceof Error ? err.message : "Identification failed",
        };
      }
    },
  };
}
