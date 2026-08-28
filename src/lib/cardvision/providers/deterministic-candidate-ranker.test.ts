import { describe, expect, it } from "vitest";
import { deterministicCandidateRanker } from "./deterministic-candidate-ranker";
import type { RecognitionCandidate } from "../types";

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
    score: 0.5,
    ...overrides,
  };
}

describe("deterministicCandidateRanker", () => {
  it("weights all three signals when every candidate has all three present", () => {
    const [ranked] = deterministicCandidateRanker.rank(
      [makeCandidate({ visualSimilarity: 1, ocrScore: 1, metadataScore: 1 })],
      { ocr: null }
    );
    expect(ranked.score).toBeCloseTo(1, 5);
  });

  it("rescores proportionally over only the present signals rather than penalizing a missing one", () => {
    // Only ocrScore present -> combined score should equal ocrScore exactly
    // (weighted average over a single present signal is that signal itself).
    const [ranked] = deterministicCandidateRanker.rank(
      [makeCandidate({ ocrScore: 0.8, visualSimilarity: null, metadataScore: null })],
      { ocr: null }
    );
    expect(ranked.score).toBeCloseTo(0.8, 5);
  });

  it("falls back to the candidate's own retrieval score when no signal breakdown is present at all", () => {
    const [ranked] = deterministicCandidateRanker.rank(
      [makeCandidate({ score: 0.42, visualSimilarity: null, ocrScore: null, metadataScore: null })],
      { ocr: null }
    );
    expect(ranked.score).toBe(0.42);
  });

  it("sorts the returned candidates by score, highest first", () => {
    const ranked = deterministicCandidateRanker.rank(
      [makeCandidate({ catalogItemId: "a", ocrScore: 0.3 }), makeCandidate({ catalogItemId: "b", ocrScore: 0.9 })],
      { ocr: null }
    );
    expect(ranked.map((c) => c.catalogItemId)).toEqual(["b", "a"]);
  });

  it("does not mutate the input array or its candidates", () => {
    const input = [makeCandidate({ ocrScore: 0.5, score: 0.1 })];
    const originalScore = input[0].score;
    deterministicCandidateRanker.rank(input, { ocr: null });
    expect(input[0].score).toBe(originalScore);
  });
});
