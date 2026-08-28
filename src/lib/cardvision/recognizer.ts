/**
 * CardVisionRecognizer — the top-level entry point requirement #1 of the
 * CardVision brief asks for: a provider-agnostic `recognize(image)` that
 * returns a structured RecognitionResult, composed from the four
 * independently-swappable providers in ./providers/types.ts. This file
 * never names a specific embedding model, OCR engine, or vector database —
 * only the interfaces from ./providers/types.ts and their Phase-1
 * scaffold implementations.
 *
 * `recognize`/`recognizeMany` never throw for a single card's failure —
 * mirrors src/lib/scanning/pipeline.ts's "a per-card failure becomes an
 * error-status result, not a thrown exception" convention exactly, so a
 * caller processing many cards from one photo never needs its own
 * try/catch per card.
 */
import { classifyRecognitionConfidence } from "./confidence";
import { catalogTextRetriever } from "./providers/catalog-text-retriever";
import { deterministicCandidateRanker } from "./providers/deterministic-candidate-ranker";
import { nullEmbeddingProvider } from "./providers/null-embedding-provider";
import { noopOcrProvider } from "./providers/noop-ocr-provider";
import type { CandidateRanker, CandidateRetriever, OCRProvider, VisionEmbeddingProvider } from "./providers/types";
import { noopTelemetryRecorder } from "./telemetry";
import type { RecognitionTelemetryRecorder } from "./telemetry";
import type { CardPosition, ImageRef, MultiCardRecognitionResult, RecognitionResult, RecognitionStatus } from "./types";

export interface CardVisionRecognizerConfig {
  embeddingProvider: VisionEmbeddingProvider;
  ocrProvider: OCRProvider;
  retriever: CandidateRetriever;
  ranker: CandidateRanker;
  telemetry: RecognitionTelemetryRecorder;
  /** Identifies this recognizer's provider set in RecognitionResult.metadata.provider and telemetry — see config.ts's CARDVISION_PROVIDER. */
  providerId: string;
}

export interface CardVisionRecognizer {
  readonly id: string;
  recognize(input: { image: ImageRef; position: CardPosition; gameHint?: string }): Promise<RecognitionResult>;
  recognizeMany(input: {
    image: ImageRef;
    positions: CardPosition[];
    gameHint?: string;
  }): Promise<MultiCardRecognitionResult>;
}

function computeTopCandidateSeparation(scores: number[]): number {
  if (scores.length === 0) return 0;
  if (scores.length === 1) return scores[0];
  return scores[0] - scores[1];
}

function deriveStatus(candidateCount: number, confidenceLevel: ReturnType<typeof classifyRecognitionConfidence>): RecognitionStatus {
  if (candidateCount === 0) return "unidentified";
  // Any non-empty candidate list beyond HIGH_CONFIDENCE still needs a human
  // look before being acted on (see confidence.ts's
  // computeRecognitionNeedsReview) — NEEDS_REVIEW and LOW_CONFIDENCE both
  // collapse to the "needs_review" status; the finer distinction stays
  // available via `confidenceLevel` for a caller that wants to
  // differentiate "here are some options" from "please identify manually".
  if (confidenceLevel === "HIGH_CONFIDENCE") return "recognized";
  return "needs_review";
}

function buildErrorResult(position: CardPosition, providerId: string, processingTimeMs: number, message: string): RecognitionResult {
  return {
    recognitionId: crypto.randomUUID(),
    status: "error",
    confidenceLevel: "ERROR",
    cardId: null,
    confidence: 0,
    candidates: [],
    ocr: null,
    position,
    metadata: { provider: providerId, processingTimeMs },
    error: message,
  };
}

export function createCardVisionRecognizer(overrides: Partial<CardVisionRecognizerConfig> = {}): CardVisionRecognizer {
  const config: CardVisionRecognizerConfig = {
    embeddingProvider: nullEmbeddingProvider,
    ocrProvider: noopOcrProvider,
    retriever: catalogTextRetriever,
    ranker: deterministicCandidateRanker,
    telemetry: noopTelemetryRecorder,
    providerId: "cardvision-scaffold",
    ...overrides,
  };

  async function recognize(input: { image: ImageRef; position: CardPosition; gameHint?: string }): Promise<RecognitionResult> {
    const startedAt = Date.now();
    let result: RecognitionResult;

    try {
      const [embedding, ocr] = await Promise.all([
        config.embeddingProvider.embed(input.image),
        config.ocrProvider.read(input.image),
      ]);

      const retrieved = await config.retriever.retrieve({ embedding, ocr, gameHint: input.gameHint });
      const ranked = config.ranker.rank(retrieved, { ocr, gameHint: input.gameHint });

      const scores = ranked.map((c) => c.score);
      const confidenceLevel = classifyRecognitionConfidence({
        topScore: scores[0] ?? 0,
        topCandidateSeparation: computeTopCandidateSeparation(scores),
        candidateCount: ranked.length,
      });
      const status = deriveStatus(ranked.length, confidenceLevel);

      result = {
        recognitionId: crypto.randomUUID(),
        status,
        confidenceLevel,
        // A human still confirms even a HIGH_CONFIDENCE pick before it's
        // acted on by a feature — same deliberate choice as
        // src/lib/scanning/pipeline.ts's DetectedCard.selectedCandidateId.
        // Consumers read candidates[0] for CardVision's top pick.
        cardId: null,
        confidence: scores[0] ?? 0,
        candidates: ranked,
        ocr,
        position: input.position,
        metadata: { provider: config.providerId, processingTimeMs: Date.now() - startedAt },
        error: null,
      };
    } catch (err) {
      result = buildErrorResult(
        input.position,
        config.providerId,
        Date.now() - startedAt,
        err instanceof Error ? err.message : "CardVision recognition failed"
      );
    }

    try {
      await config.telemetry.record({
        recognitionId: result.recognitionId,
        image: { kind: input.image.kind, mimeType: input.image.mimeType },
        provider: config.providerId,
        status: result.status,
        cardId: result.cardId,
        candidateIds: result.candidates.map((c) => c.catalogItemId),
        confidence: result.confidence,
        ocr: result.ocr,
        processingTimeMs: result.metadata.processingTimeMs,
        userCorrectedCardId: null,
        wasCorrect: null,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Telemetry is best-effort — see telemetry.ts's convention (mirrors
      // src/lib/activity/log.ts: a logging hiccup never fails the actual
      // recognition result).
    }

    return result;
  }

  async function recognizeMany(input: {
    image: ImageRef;
    positions: CardPosition[];
    gameHint?: string;
  }): Promise<MultiCardRecognitionResult> {
    try {
      const results = await Promise.all(
        input.positions.map((position) => recognize({ image: input.image, position, gameHint: input.gameHint }))
      );
      return {
        sourceImageId: input.positions[0]?.imageId ?? crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        results,
        error: null,
      };
    } catch (err) {
      return {
        sourceImageId: input.positions[0]?.imageId ?? crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        results: [],
        error: err instanceof Error ? err.message : "CardVision multi-card recognition failed",
      };
    }
  }

  return { id: config.providerId, recognize, recognizeMany };
}
