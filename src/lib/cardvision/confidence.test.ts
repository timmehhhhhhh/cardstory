import { describe, expect, it } from "vitest";
import { classifyRecognitionConfidence, computeRecognitionNeedsReview } from "./confidence";

describe("classifyRecognitionConfidence", () => {
  it("returns HIGH_CONFIDENCE only when the top score and top-candidate separation both clear their thresholds", () => {
    expect(
      classifyRecognitionConfidence({ topScore: 0.9, topCandidateSeparation: 0.3, candidateCount: 2 })
    ).toBe("HIGH_CONFIDENCE");
  });

  it("returns NEEDS_REVIEW when the top score is HIGH but the runner-up is too close", () => {
    expect(
      classifyRecognitionConfidence({ topScore: 0.9, topCandidateSeparation: 0.05, candidateCount: 2 })
    ).toBe("NEEDS_REVIEW");
  });

  it("returns NEEDS_REVIEW for a decent-but-not-standout top score", () => {
    expect(
      classifyRecognitionConfidence({ topScore: 0.6, topCandidateSeparation: 0.5, candidateCount: 1 })
    ).toBe("NEEDS_REVIEW");
  });

  it("returns LOW_CONFIDENCE for a weak-but-present top score", () => {
    expect(
      classifyRecognitionConfidence({ topScore: 0.3, topCandidateSeparation: 0.3, candidateCount: 2 })
    ).toBe("LOW_CONFIDENCE");
  });

  it("returns UNIDENTIFIED when candidateCount is 0", () => {
    expect(
      classifyRecognitionConfidence({ topScore: 0, topCandidateSeparation: 0, candidateCount: 0 })
    ).toBe("UNIDENTIFIED");
  });

  it("returns UNIDENTIFIED when the top score is below the low-confidence floor even with candidates present", () => {
    expect(
      classifyRecognitionConfidence({ topScore: 0.1, topCandidateSeparation: 0.1, candidateCount: 3 })
    ).toBe("UNIDENTIFIED");
  });

  it("returns exact boundary values", () => {
    // Exactly at the UNIDENTIFIED floor (0.2) -> not UNIDENTIFIED (LOW_CONFIDENCE, since it's below NEEDS_REVIEW_SCORE_MIN).
    expect(
      classifyRecognitionConfidence({ topScore: 0.2, topCandidateSeparation: 0, candidateCount: 1 })
    ).toBe("LOW_CONFIDENCE");
    // Just below the floor -> UNIDENTIFIED.
    expect(
      classifyRecognitionConfidence({ topScore: 0.199, topCandidateSeparation: 0, candidateCount: 1 })
    ).toBe("UNIDENTIFIED");
    // Exactly at the NEEDS_REVIEW floor (0.5) -> NEEDS_REVIEW.
    expect(
      classifyRecognitionConfidence({ topScore: 0.5, topCandidateSeparation: 0, candidateCount: 1 })
    ).toBe("NEEDS_REVIEW");
    // Exactly at the HIGH_CONFIDENCE floors (score 0.75, separation 0.15) -> HIGH_CONFIDENCE.
    expect(
      classifyRecognitionConfidence({ topScore: 0.75, topCandidateSeparation: 0.15, candidateCount: 2 })
    ).toBe("HIGH_CONFIDENCE");
  });
});

describe("computeRecognitionNeedsReview", () => {
  it("is false only for HIGH_CONFIDENCE + recognized", () => {
    expect(computeRecognitionNeedsReview("HIGH_CONFIDENCE", "recognized")).toBe(false);
  });

  it("is true for HIGH_CONFIDENCE with a non-recognized status (defensive case)", () => {
    expect(computeRecognitionNeedsReview("HIGH_CONFIDENCE", "error")).toBe(true);
  });

  it("is true for every non-HIGH_CONFIDENCE level", () => {
    expect(computeRecognitionNeedsReview("NEEDS_REVIEW", "recognized")).toBe(true);
    expect(computeRecognitionNeedsReview("LOW_CONFIDENCE", "recognized")).toBe(true);
    expect(computeRecognitionNeedsReview("UNIDENTIFIED", "unidentified")).toBe(true);
    expect(computeRecognitionNeedsReview("ERROR", "error")).toBe(true);
  });
});
