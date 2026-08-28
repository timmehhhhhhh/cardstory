import { describe, expect, it } from "vitest";
import { runScanPipeline, runScanPipelineSafe } from "./pipeline";
import type { CardDetector, DetectionRegion } from "./detectors/types";
import type { ImageProcessor } from "./image-processing/types";
import type { IdentificationOutput, IdentificationStrategy } from "./identify/types";
import type { ImageRef } from "./types";

const testImage: ImageRef = { kind: "inline", base64: "abc", mimeType: "image/jpeg" };

function fixtureDetector(regions: DetectionRegion[]): CardDetector {
  return { id: "fixture-detector", detect: async () => regions };
}

function throwingDetector(message: string): CardDetector {
  return {
    id: "throwing-detector",
    detect: async () => {
      throw new Error(message);
    },
  };
}

const passthroughProcessor: ImageProcessor = {
  id: "fixture-processor",
  crop: async (image) => image,
  correctOrientation: async (image) => image,
  correctPerspective: async (image) => image,
};

function fixtureStrategy(output: IdentificationOutput | ((call: number) => IdentificationOutput)): IdentificationStrategy {
  let call = 0;
  return {
    id: "fixture-strategy",
    identify: async () => {
      const result = typeof output === "function" ? output(call) : output;
      call += 1;
      return result;
    },
  };
}

const identifiedOutput: IdentificationOutput = {
  status: "identified",
  identificationConfidence: 0.9,
  candidates: [
    { catalogItemId: "pokemon:1", gameId: "pokemon", name: "Pikachu", setName: "Base Set", number: null, imageSmallUrl: null, score: 0.9 },
  ],
  error: null,
};

describe("runScanPipeline", () => {
  it("produces an empty-cards ScanResult with no error for a no-card image", async () => {
    const result = await runScanPipeline({
      image: testImage,
      detector: fixtureDetector([]),
      imageProcessor: passthroughProcessor,
      identificationStrategy: fixtureStrategy(identifiedOutput),
    });
    expect(result.cards).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("produces exactly one DetectedCard with detectedPosition.index 0 for a single-card image", async () => {
    const result = await runScanPipeline({
      image: testImage,
      detector: fixtureDetector([{ box: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 }, confidence: 0.9 }]),
      imageProcessor: passthroughProcessor,
      identificationStrategy: fixtureStrategy(identifiedOutput),
    });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].detectedPosition.index).toBe(0);
  });

  it("produces N DetectedCards ordered by reading order for a multiple-card image", async () => {
    const regions: DetectionRegion[] = [
      { box: { x: 0.6, y: 0.1, width: 0.3, height: 0.3 }, confidence: 0.9 }, // top-right
      { box: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 }, confidence: 0.9 }, // top-left
    ];
    const result = await runScanPipeline({
      image: testImage,
      detector: fixtureDetector(regions),
      imageProcessor: passthroughProcessor,
      identificationStrategy: fixtureStrategy(identifiedOutput),
    });
    expect(result.cards).toHaveLength(2);
    // top-left (originally index 1) should read first.
    expect(result.cards[0].boundingBox.x).toBeCloseTo(0.1);
    expect(result.cards[1].boundingBox.x).toBeCloseTo(0.6);
  });

  it("normalizes a malformed (out-of-range/NaN) detection box rather than propagating invalid data", async () => {
    const result = await runScanPipeline({
      image: testImage,
      detector: fixtureDetector([{ box: { x: NaN, y: -5, width: 50, height: 50 }, confidence: 0.5 }]),
      imageProcessor: passthroughProcessor,
      identificationStrategy: fixtureStrategy(identifiedOutput),
    });
    const box = result.cards[0].boundingBox;
    expect(Number.isFinite(box.x)).toBe(true);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.width).toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThanOrEqual(1);
  });

  it("produces two ScanResults with different ids/timestamps but identical card content for duplicate inputs", async () => {
    const input = {
      image: testImage,
      detector: fixtureDetector([{ box: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 }, confidence: 0.8 }]),
      imageProcessor: passthroughProcessor,
      identificationStrategy: fixtureStrategy(identifiedOutput),
    };
    const first = await runScanPipeline(input);
    const second = await runScanPipeline(input);

    expect(first.scanResultId).not.toBe(second.scanResultId);
    expect(first.sourceImageId).not.toBe(second.sourceImageId);
    expect(first.cards[0].boundingBox).toEqual(second.cards[0].boundingBox);
    expect(first.cards[0].candidates).toEqual(second.cards[0].candidates);
  });

  it("captures a per-card identification failure as that card's error without failing the other cards", async () => {
    let call = 0;
    const strategy: IdentificationStrategy = {
      id: "flaky",
      identify: async () => {
        call += 1;
        if (call === 1) throw new Error("boom");
        return identifiedOutput;
      },
    };
    const result = await runScanPipeline({
      image: testImage,
      detector: fixtureDetector([
        { box: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }, confidence: 0.8 },
        { box: { x: 0.6, y: 0.1, width: 0.2, height: 0.2 }, confidence: 0.8 },
      ]),
      imageProcessor: passthroughProcessor,
      identificationStrategy: strategy,
    });
    const errored = result.cards.find((c) => c.identificationStatus === "error");
    const identified = result.cards.find((c) => c.identificationStatus === "identified");
    expect(errored?.error).toBeTruthy();
    expect(identified).toBeTruthy();
  });

  it("throws when the detector itself rejects", async () => {
    await expect(
      runScanPipeline({
        image: testImage,
        detector: throwingDetector("detector unreachable"),
        imageProcessor: passthroughProcessor,
        identificationStrategy: fixtureStrategy(identifiedOutput),
      })
    ).rejects.toThrow("detector unreachable");
  });

  it("caps the number of regions sent to identification at maxCards", async () => {
    let identifyCalls = 0;
    const strategy: IdentificationStrategy = {
      id: "counting",
      identify: async () => {
        identifyCalls += 1;
        return identifiedOutput;
      },
    };
    const regions: DetectionRegion[] = Array.from({ length: 5 }, (_, i) => ({
      box: { x: i * 0.15, y: 0.1, width: 0.1, height: 0.1 },
      confidence: 0.8,
    }));
    const result = await runScanPipeline({
      image: testImage,
      detector: fixtureDetector(regions),
      imageProcessor: passthroughProcessor,
      identificationStrategy: strategy,
      maxCards: 2,
    });
    expect(result.cards).toHaveLength(2);
    expect(identifyCalls).toBe(2);
  });
});

describe("runScanPipelineSafe", () => {
  it("catches a whole-pipeline detector failure and returns a well-formed ScanResult with an error instead of throwing", async () => {
    const result = await runScanPipelineSafe({
      image: testImage,
      detector: throwingDetector("provider unreachable"),
      imageProcessor: passthroughProcessor,
      identificationStrategy: fixtureStrategy(identifiedOutput),
    });
    expect(result.cards).toEqual([]);
    expect(result.error).toContain("provider unreachable");
  });
});
