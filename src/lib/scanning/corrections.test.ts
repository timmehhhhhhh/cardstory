import { describe, expect, it } from "vitest";
import { applyManualCorrection, markCardSkipped, retryIdentification, unskipCard } from "./corrections";
import type { DetectedCard, ScanResult } from "./types";
import type { IdentificationStrategy } from "./identify/types";

function makeCard(overrides: Partial<DetectedCard> = {}): DetectedCard {
  return {
    cardId: "card-1",
    sourceImageId: "image-1",
    boundingBox: { x: 0, y: 0, width: 0.5, height: 0.5, centerX: 0.25, centerY: 0.25, rotation: 0 },
    detectedPosition: { index: 0 },
    croppedImage: { kind: "inline", base64: "abc", mimeType: "image/jpeg" },
    orientation: 0,
    detectionConfidence: 0.8,
    identificationStatus: "identified",
    identificationConfidence: 0.5,
    candidates: [
      { catalogItemId: "pokemon:1", gameId: "pokemon", name: "Pikachu", setName: "Base Set", number: null, imageSmallUrl: null, score: 0.9 },
      { catalogItemId: "pokemon:2", gameId: "pokemon", name: "Raichu", setName: "Base Set", number: null, imageSmallUrl: null, score: 0.4 },
    ],
    selectedCandidateId: null,
    confidenceLevel: "MEDIUM",
    needsReview: true,
    error: null,
    skipped: false,
    ...overrides,
  };
}

function makeResult(cards: DetectedCard[]): ScanResult {
  return {
    scanResultId: "scan-1",
    sourceImageId: "image-1",
    createdAt: new Date().toISOString(),
    cards,
    error: null,
  };
}

describe("applyManualCorrection", () => {
  it("sets selectedCandidateId and clears needsReview for an offered candidate", () => {
    const result = makeResult([makeCard()]);
    const corrected = applyManualCorrection(result, 0, "pokemon:2");
    expect(corrected.cards[0].selectedCandidateId).toBe("pokemon:2");
    expect(corrected.cards[0].needsReview).toBe(false);
  });

  it("throws when newCandidateId isn't among that card's candidates", () => {
    const result = makeResult([makeCard()]);
    expect(() => applyManualCorrection(result, 0, "pokemon:999")).toThrow();
  });

  it("does not mutate the input ScanResult", () => {
    const result = makeResult([makeCard()]);
    const original = JSON.parse(JSON.stringify(result));
    applyManualCorrection(result, 0, "pokemon:1");
    expect(result).toEqual(original);
  });

  it("leaves every other card in cards untouched", () => {
    const result = makeResult([makeCard({ cardId: "card-1" }), makeCard({ cardId: "card-2" })]);
    const corrected = applyManualCorrection(result, 0, "pokemon:1");
    expect(corrected.cards[1]).toBe(result.cards[1]);
  });
});

describe("markCardSkipped / unskipCard", () => {
  it("markCardSkipped sets skipped:true and needsReview:false without altering selectedCandidateId", () => {
    const result = makeResult([makeCard({ selectedCandidateId: "pokemon:1" })]);
    const skipped = markCardSkipped(result, 0);
    expect(skipped.cards[0].skipped).toBe(true);
    expect(skipped.cards[0].needsReview).toBe(false);
    expect(skipped.cards[0].selectedCandidateId).toBe("pokemon:1");
  });

  it("unskipCard reverses markCardSkipped and recomputes needsReview from confidence/status", () => {
    const result = makeResult([makeCard({ confidenceLevel: "HIGH", identificationStatus: "identified" })]);
    const skipped = markCardSkipped(result, 0);
    const unskipped = unskipCard(skipped, 0);
    expect(unskipped.cards[0].skipped).toBe(false);
    expect(unskipped.cards[0].needsReview).toBe(false);
  });
});

describe("retryIdentification", () => {
  it("replaces only the targeted card's identification fields, leaving crop/geometry unchanged", async () => {
    const card = makeCard();
    const result = makeResult([card]);
    const fixtureStrategy: IdentificationStrategy = {
      id: "fixture",
      async identify() {
        return {
          status: "identified",
          identificationConfidence: 0.99,
          candidates: [
            { catalogItemId: "pokemon:3", gameId: "pokemon", name: "New Match", setName: "Set", number: null, imageSmallUrl: null, score: 1 },
          ],
          error: null,
        };
      },
    };

    const retried = await retryIdentification(result, 0, fixtureStrategy);
    expect(retried.cards[0].identificationConfidence).toBe(0.99);
    expect(retried.cards[0].candidates[0].catalogItemId).toBe("pokemon:3");
    expect(retried.cards[0].croppedImage).toEqual(card.croppedImage);
    expect(retried.cards[0].boundingBox).toEqual(card.boundingBox);
    expect(retried.cards[0].detectedPosition).toEqual(card.detectedPosition);
  });
});
