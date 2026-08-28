import { describe, expect, it } from "vitest";
import { toIdentificationStrategy } from "./identification-strategy-adapter";
import type { CardVisionRecognizer } from "./recognizer";
import type { ImageRef, RecognitionResult } from "./types";

const testImage: ImageRef = { kind: "inline", base64: "abc", mimeType: "image/jpeg" };

function fixtureRecognizer(result: RecognitionResult): CardVisionRecognizer {
  return {
    id: "fixture-cardvision",
    recognize: async () => result,
    recognizeMany: async () => ({ sourceImageId: "img", createdAt: new Date().toISOString(), results: [result], error: null }),
  };
}

function makeResult(overrides: Partial<RecognitionResult> = {}): RecognitionResult {
  return {
    recognitionId: "rec-1",
    status: "recognized",
    confidenceLevel: "HIGH_CONFIDENCE",
    cardId: null,
    confidence: 0.9,
    candidates: [
      {
        catalogItemId: "pokemon:1",
        gameId: "pokemon",
        name: "Pikachu",
        setName: "Base Set",
        number: "58",
        imageSmallUrl: null,
        visualSimilarity: null,
        ocrScore: 0.9,
        metadataScore: null,
        score: 0.9,
      },
    ],
    ocr: null,
    position: { imageId: "img", index: 0, row: null, column: null, page: null, boundingBox: { x: 0, y: 0, width: 1, height: 1, centerX: 0.5, centerY: 0.5, rotation: 0 } },
    metadata: { provider: "fixture", processingTimeMs: 5 },
    error: null,
    ...overrides,
  };
}

describe("toIdentificationStrategy", () => {
  it("returns unidentified immediately when there is no cropped image, without calling the recognizer", async () => {
    let called = false;
    const recognizer = fixtureRecognizer(makeResult());
    const strategy = toIdentificationStrategy({
      ...recognizer,
      recognize: async () => {
        called = true;
        return makeResult();
      },
    });

    const output = await strategy.identify({ croppedImage: null });

    expect(output).toEqual({ status: "unidentified", identificationConfidence: 0, candidates: [], error: null });
    expect(called).toBe(false);
  });

  it("maps a CardVision RecognitionResult with candidates into an ambiguous IdentificationOutput, never auto-'identified'", async () => {
    const strategy = toIdentificationStrategy(fixtureRecognizer(makeResult()));

    const output = await strategy.identify({ croppedImage: testImage });

    expect(output.status).toBe("ambiguous");
    expect(output.identificationConfidence).toBe(0.9);
    expect(output.candidates).toEqual([
      { catalogItemId: "pokemon:1", gameId: "pokemon", name: "Pikachu", setName: "Base Set", number: "58", imageSmallUrl: null, score: 0.9 },
    ]);
    expect(output.error).toBeNull();
  });

  it("maps a candidate-less result to unidentified", async () => {
    const strategy = toIdentificationStrategy(fixtureRecognizer(makeResult({ status: "unidentified", candidates: [], confidence: 0 })));

    const output = await strategy.identify({ croppedImage: testImage });

    expect(output.status).toBe("unidentified");
    expect(output.candidates).toEqual([]);
  });

  it("maps an error result to an error IdentificationOutput", async () => {
    const strategy = toIdentificationStrategy(
      fixtureRecognizer(makeResult({ status: "error", confidenceLevel: "ERROR", candidates: [], error: "boom" }))
    );

    const output = await strategy.identify({ croppedImage: testImage });

    expect(output).toEqual({ status: "error", identificationConfidence: 0, candidates: [], error: "boom" });
  });
});
