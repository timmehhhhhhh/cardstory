import { describe, expect, it } from "vitest";
import { classifyConfidence, computeNeedsReview } from "./confidence";

describe("classifyConfidence", () => {
  it("returns HIGH only when detection, identification, and separation all clear their thresholds", () => {
    expect(
      classifyConfidence({
        detectionConfidence: 0.9,
        identificationConfidence: 0.9,
        topCandidateSeparation: 0.3,
        candidateCount: 2,
      })
    ).toBe("HIGH");
  });

  it("returns UNIDENTIFIED when candidateCount is 0", () => {
    expect(
      classifyConfidence({
        detectionConfidence: 0.95,
        identificationConfidence: 0.95,
        topCandidateSeparation: 0,
        candidateCount: 0,
      })
    ).toBe("UNIDENTIFIED");
  });

  it("returns UNIDENTIFIED when identificationConfidence is below the low-confidence floor even with candidates present", () => {
    expect(
      classifyConfidence({
        detectionConfidence: 0.9,
        identificationConfidence: 0.1,
        topCandidateSeparation: 0.5,
        candidateCount: 3,
      })
    ).toBe("UNIDENTIFIED");
  });

  it("returns exact boundary values between HIGH/MEDIUM/UNIDENTIFIED", () => {
    // Exactly at the UNIDENTIFIED floor (<=0.2) -> UNIDENTIFIED.
    expect(
      classifyConfidence({
        detectionConfidence: 0.9,
        identificationConfidence: 0.2,
        topCandidateSeparation: 0.5,
        candidateCount: 1,
      })
    ).toBe("UNIDENTIFIED");

    // Just above the floor, but below MEDIUM's 0.4 floor -> LOW.
    expect(
      classifyConfidence({
        detectionConfidence: 0.3,
        identificationConfidence: 0.3,
        topCandidateSeparation: 0.5,
        candidateCount: 1,
      })
    ).toBe("LOW");

    // Exactly at MEDIUM's thresholds -> MEDIUM.
    expect(
      classifyConfidence({
        detectionConfidence: 0.4,
        identificationConfidence: 0.4,
        topCandidateSeparation: 0,
        candidateCount: 1,
      })
    ).toBe("MEDIUM");

    // Exactly at HIGH's thresholds -> HIGH.
    expect(
      classifyConfidence({
        detectionConfidence: 0.7,
        identificationConfidence: 0.7,
        topCandidateSeparation: 0.15,
        candidateCount: 1,
      })
    ).toBe("HIGH");
  });

  it("returns a lower level when two candidates are near-tied even at a high top score", () => {
    const result = classifyConfidence({
      detectionConfidence: 0.9,
      identificationConfidence: 0.9,
      topCandidateSeparation: 0.01,
      candidateCount: 2,
    });
    expect(result).toBe("MEDIUM");
  });
});

describe("computeNeedsReview", () => {
  it("is true for every non-HIGH confidenceLevel", () => {
    expect(computeNeedsReview("MEDIUM", "identified")).toBe(true);
    expect(computeNeedsReview("LOW", "identified")).toBe(true);
    expect(computeNeedsReview("UNIDENTIFIED", "unidentified")).toBe(true);
  });

  it("is true for non-identified status even if confidenceLevel were HIGH (defensive case)", () => {
    expect(computeNeedsReview("HIGH", "ambiguous")).toBe(true);
    expect(computeNeedsReview("HIGH", "unidentified")).toBe(true);
    expect(computeNeedsReview("HIGH", "error")).toBe(true);
    expect(computeNeedsReview("HIGH", "pending")).toBe(true);
  });

  it("is false only for HIGH + identified", () => {
    expect(computeNeedsReview("HIGH", "identified")).toBe(false);
  });
});
