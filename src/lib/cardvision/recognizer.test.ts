import { describe, expect, it } from "vitest";
import { createCardVisionRecognizer } from "./recognizer";
import type { CandidateRanker, CandidateRetriever, OCRProvider, VisionEmbeddingProvider } from "./providers/types";
import type { RecognitionAttempt, RecognitionTelemetryRecorder } from "./telemetry";
import type { CardPosition, ImageRef, RecognitionCandidate } from "./types";

const testImage: ImageRef = { kind: "inline", base64: "abc", mimeType: "image/jpeg" };

function makePosition(overrides: Partial<CardPosition> = {}): CardPosition {
  return {
    imageId: "image-1",
    index: 0,
    row: null,
    column: null,
    page: null,
    boundingBox: { x: 0, y: 0, width: 1, height: 1, centerX: 0.5, centerY: 0.5, rotation: 0 },
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<RecognitionCandidate> = {}): RecognitionCandidate {
  return {
    catalogItemId: "pokemon:1",
    gameId: "pokemon",
    name: "Pikachu",
    setName: "Base Set",
    number: null,
    imageSmallUrl: null,
    visualSimilarity: null,
    ocrScore: null,
    metadataScore: null,
    score: 0.9,
    ...overrides,
  };
}

const nullEmbedding: VisionEmbeddingProvider = { id: "fixture-embedding", embed: async () => null };
const emptyOcr: OCRProvider = {
  id: "fixture-ocr",
  read: async () => ({ name: null, collectorNumber: null, setNameOrSymbol: null, rawText: null }),
};

function fixtureRetriever(candidates: RecognitionCandidate[]): CandidateRetriever {
  return { id: "fixture-retriever", retrieve: async () => candidates };
}

const passthroughRanker: CandidateRanker = {
  id: "fixture-ranker",
  rank: (candidates: RecognitionCandidate[]) => [...candidates].sort((a, b) => b.score - a.score),
};

function throwingRetriever(message: string): CandidateRetriever {
  return {
    id: "throwing-retriever",
    retrieve: async () => {
      throw new Error(message);
    },
  };
}

describe("createCardVisionRecognizer / recognize", () => {
  it("returns an UNIDENTIFIED, unidentified-status result when the retriever finds no candidates", async () => {
    const recognizer = createCardVisionRecognizer({
      embeddingProvider: nullEmbedding,
      ocrProvider: emptyOcr,
      retriever: fixtureRetriever([]),
      ranker: passthroughRanker,
    });

    const result = await recognizer.recognize({ image: testImage, position: makePosition() });

    expect(result.status).toBe("unidentified");
    expect(result.confidenceLevel).toBe("UNIDENTIFIED");
    expect(result.candidates).toEqual([]);
    expect(result.cardId).toBeNull();
  });

  it("returns a recognized/HIGH_CONFIDENCE result for a standout top candidate", async () => {
    const recognizer = createCardVisionRecognizer({
      embeddingProvider: nullEmbedding,
      ocrProvider: emptyOcr,
      retriever: fixtureRetriever([makeCandidate({ score: 0.95 }), makeCandidate({ catalogItemId: "pokemon:2", score: 0.2 })]),
      ranker: passthroughRanker,
    });

    const result = await recognizer.recognize({ image: testImage, position: makePosition() });

    expect(result.status).toBe("recognized");
    expect(result.confidenceLevel).toBe("HIGH_CONFIDENCE");
    expect(result.candidates[0].catalogItemId).toBe("pokemon:1");
    // Never auto-selects, even at HIGH_CONFIDENCE.
    expect(result.cardId).toBeNull();
  });

  it("returns a needs_review status for close-scoring candidates", async () => {
    const recognizer = createCardVisionRecognizer({
      embeddingProvider: nullEmbedding,
      ocrProvider: emptyOcr,
      retriever: fixtureRetriever([makeCandidate({ score: 0.9 }), makeCandidate({ catalogItemId: "pokemon:2", score: 0.85 })]),
      ranker: passthroughRanker,
    });

    const result = await recognizer.recognize({ image: testImage, position: makePosition() });

    expect(result.status).toBe("needs_review");
    expect(result.confidenceLevel).toBe("NEEDS_REVIEW");
  });

  it("preserves the given CardPosition on the result verbatim", async () => {
    const position = makePosition({ row: 2, column: 3, page: 1, index: 5 });
    const recognizer = createCardVisionRecognizer({
      embeddingProvider: nullEmbedding,
      ocrProvider: emptyOcr,
      retriever: fixtureRetriever([]),
      ranker: passthroughRanker,
    });

    const result = await recognizer.recognize({ image: testImage, position });

    expect(result.position).toEqual(position);
  });

  it("never throws for a provider failure — returns an error-status result instead", async () => {
    const recognizer = createCardVisionRecognizer({
      embeddingProvider: nullEmbedding,
      ocrProvider: emptyOcr,
      retriever: throwingRetriever("retriever exploded"),
      ranker: passthroughRanker,
    });

    const result = await recognizer.recognize({ image: testImage, position: makePosition() });

    expect(result.status).toBe("error");
    expect(result.confidenceLevel).toBe("ERROR");
    expect(result.error).toBe("retriever exploded");
  });

  it("records telemetry without raw image bytes", async () => {
    const recorded: RecognitionAttempt[] = [];
    const recorder: RecognitionTelemetryRecorder = {
      id: "fixture-telemetry",
      record: async (entry) => {
        recorded.push(entry);
      },
    };
    const recognizer = createCardVisionRecognizer({
      embeddingProvider: nullEmbedding,
      ocrProvider: emptyOcr,
      retriever: fixtureRetriever([makeCandidate()]),
      ranker: passthroughRanker,
      telemetry: recorder,
    });

    await recognizer.recognize({ image: testImage, position: makePosition() });

    expect(recorded).toHaveLength(1);
    expect(recorded[0].image).toEqual({ kind: "inline", mimeType: "image/jpeg" });
    expect((recorded[0].image as unknown as Record<string, unknown>).base64).toBeUndefined();
    expect(recorded[0].userCorrectedCardId).toBeNull();
    expect(recorded[0].wasCorrect).toBeNull();
  });

  it("survives a telemetry failure without affecting the returned result", async () => {
    const recorder: RecognitionTelemetryRecorder = {
      id: "throwing-telemetry",
      record: async () => {
        throw new Error("telemetry write failed");
      },
    };
    const recognizer = createCardVisionRecognizer({
      embeddingProvider: nullEmbedding,
      ocrProvider: emptyOcr,
      retriever: fixtureRetriever([makeCandidate()]),
      ranker: passthroughRanker,
      telemetry: recorder,
    });

    const result = await recognizer.recognize({ image: testImage, position: makePosition() });
    expect(result.status).toBe("recognized");
  });
});

describe("createCardVisionRecognizer / recognizeMany", () => {
  it("recognizes every position and preserves reading-order index/row/column", async () => {
    const recognizer = createCardVisionRecognizer({
      embeddingProvider: nullEmbedding,
      ocrProvider: emptyOcr,
      retriever: fixtureRetriever([makeCandidate({ score: 0.95 })]),
      ranker: passthroughRanker,
    });

    const positions = [makePosition({ index: 0, row: 0, column: 0 }), makePosition({ index: 1, row: 0, column: 1 })];
    const result = await recognizer.recognizeMany({ image: testImage, positions });

    expect(result.error).toBeNull();
    expect(result.results).toHaveLength(2);
    expect(result.results.map((r) => r.position.index)).toEqual([0, 1]);
    expect(result.results.map((r) => r.position.column)).toEqual([0, 1]);
  });

  it("produces an empty-results MultiCardRecognitionResult with no error for zero positions", async () => {
    const recognizer = createCardVisionRecognizer({
      embeddingProvider: nullEmbedding,
      ocrProvider: emptyOcr,
      retriever: fixtureRetriever([]),
      ranker: passthroughRanker,
    });

    const result = await recognizer.recognizeMany({ image: testImage, positions: [] });

    expect(result.results).toEqual([]);
    expect(result.error).toBeNull();
  });
});
