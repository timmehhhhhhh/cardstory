import { describe, expect, it, vi } from "vitest";
import type { CandidateMatch } from "@/lib/scanning";

const { rankCandidatesMock } = vi.hoisted(() => ({ rankCandidatesMock: vi.fn() }));

// rankCandidates ultimately hits the catalog/DB (see rank-candidates.ts's
// searchCatalog call) — mocked at the module boundary the same way
// src/lib/pc/manage.test.ts mocks @/lib/db, so this test exercises only
// catalog-text-retriever.ts's own translation logic.
vi.mock("@/lib/scanning/identify/rank-candidates", () => ({ rankCandidates: rankCandidatesMock }));

const { catalogTextRetriever } = await import("./catalog-text-retriever");

function makeMatch(overrides: Partial<CandidateMatch> = {}): CandidateMatch {
  return {
    catalogItemId: "pokemon:base1-58",
    gameId: "pokemon",
    name: "Pikachu",
    setName: "Base Set",
    number: "58",
    imageSmallUrl: null,
    score: 0.8,
    ...overrides,
  };
}

describe("catalogTextRetriever", () => {
  it("returns an empty array without calling rankCandidates when OCR read no name", async () => {
    rankCandidatesMock.mockReset();
    const result = await catalogTextRetriever.retrieve({ embedding: null, ocr: { name: null, collectorNumber: null, setNameOrSymbol: null, rawText: null } });
    expect(result).toEqual([]);
    expect(rankCandidatesMock).not.toHaveBeenCalled();
  });

  it("queries rankCandidates with the OCR reading and maps matches into RecognitionCandidates", async () => {
    rankCandidatesMock.mockReset();
    rankCandidatesMock.mockResolvedValue([makeMatch()]);

    const result = await catalogTextRetriever.retrieve({
      embedding: null,
      ocr: { name: "Pikachu", collectorNumber: "58/102", setNameOrSymbol: "Base Set", rawText: "Pikachu 58/102 Base Set" },
      gameHint: "pokemon",
      limit: 3,
    });

    expect(rankCandidatesMock).toHaveBeenCalledWith({
      cardName: "Pikachu",
      cardNumber: "58/102",
      setNameOrSymbol: "Base Set",
      gameId: "pokemon",
      limit: 3,
    });
    expect(result).toEqual([
      {
        catalogItemId: "pokemon:base1-58",
        gameId: "pokemon",
        name: "Pikachu",
        setName: "Base Set",
        number: "58",
        imageSmallUrl: null,
        visualSimilarity: null,
        ocrScore: 0.8,
        metadataScore: null,
        score: 0.8,
      },
    ]);
  });
});
