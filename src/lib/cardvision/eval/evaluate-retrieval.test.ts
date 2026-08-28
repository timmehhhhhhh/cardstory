import { describe, expect, it, vi } from "vitest";
import type { CandidateRetriever, VisionEmbeddingProvider } from "../providers/types";
import type { ImageRef, RecognitionCandidate } from "../types";
import { evaluateRetrieval } from "./evaluate-retrieval";

const IMAGE: ImageRef = { kind: "inline", base64: "Zm9v", mimeType: "image/png" };

function candidate(catalogItemId: string, score: number): RecognitionCandidate {
  return { catalogItemId, gameId: "pokemon", name: catalogItemId, setName: "Base Set", number: null, imageSmallUrl: null, visualSimilarity: score, ocrScore: null, metadataScore: null, score };
}

function embeddingProviderReturning(model = "cardvision-fake"): VisionEmbeddingProvider {
  return { id: model, embed: vi.fn(async () => ({ values: [1, 0], dims: 2, model })) };
}

function retrieverReturning(rankedIds: string[]): CandidateRetriever {
  return { id: "fake-retriever", retrieve: vi.fn(async () => rankedIds.map((id, i) => candidate(id, 1 - i * 0.1))) };
}

describe("evaluateRetrieval", () => {
  it("scores top-1/5/10 as 100% when the expected item is always first", async () => {
    const retriever = retrieverReturning(["a", "b", "c"]);
    const result = await evaluateRetrieval(
      [{ label: "case-a", expectedCatalogItemId: "a", queryImage: IMAGE }],
      { embeddingProvider: embeddingProviderReturning(), retriever }
    );

    expect(result.top1Accuracy).toBe(1);
    expect(result.top5Accuracy).toBe(1);
    expect(result.top10Accuracy).toBe(1);
    expect(result.failures).toEqual([]);
  });

  it("scores top-1 as a miss but top-5/10 as a hit when the expected item is ranked 3rd", async () => {
    const retriever = retrieverReturning(["x", "y", "expected"]);
    const result = await evaluateRetrieval(
      [{ label: "case", expectedCatalogItemId: "expected", queryImage: IMAGE }],
      { embeddingProvider: embeddingProviderReturning(), retriever }
    );

    expect(result.top1Accuracy).toBe(0);
    expect(result.top5Accuracy).toBe(1);
    expect(result.top10Accuracy).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({ label: "case", rank: 3, topCandidateId: "x" });
  });

  it("counts a completely absent expected item as a failure with rank null", async () => {
    const retriever = retrieverReturning(["x", "y"]);
    const result = await evaluateRetrieval(
      [{ label: "case", expectedCatalogItemId: "missing", queryImage: IMAGE }],
      { embeddingProvider: embeddingProviderReturning(), retriever }
    );

    expect(result.top1Accuracy).toBe(0);
    expect(result.failures[0]).toMatchObject({ rank: null, topCandidateId: "x" });
  });

  it("computes accuracy as an average across multiple cases", async () => {
    const retriever: CandidateRetriever = {
      id: "fake",
      retrieve: vi.fn(async (query) => {
        // First case hits, second misses — keyed by gameHint for simplicity.
        return query.gameHint === "hit" ? [candidate("expected", 0.9)] : [candidate("other", 0.9)];
      }),
    };
    const result = await evaluateRetrieval(
      [
        { label: "hit-case", expectedCatalogItemId: "expected", queryImage: IMAGE, gameHint: "hit" },
        { label: "miss-case", expectedCatalogItemId: "expected", queryImage: IMAGE, gameHint: "miss" },
      ],
      { embeddingProvider: embeddingProviderReturning(), retriever }
    );

    expect(result.top1Accuracy).toBe(0.5);
    expect(result.total).toBe(2);
  });

  it("excludes not-configured cases (embed() returns null) from the accuracy denominator", async () => {
    const retriever = retrieverReturning(["expected"]);
    const provider: VisionEmbeddingProvider = { id: "unconfigured", embed: vi.fn(async () => null) };
    const result = await evaluateRetrieval(
      [{ label: "case", expectedCatalogItemId: "expected", queryImage: IMAGE }],
      { embeddingProvider: provider, retriever }
    );

    expect(result.skippedNotConfigured).toBe(1);
    expect(result.top1Accuracy).toBe(0); // 0 evaluated, defined as 0 not NaN/divide-by-zero
    expect(retriever.retrieve).not.toHaveBeenCalled();
  });

  it("passes role='query' (not 'document') when embedding evaluation query images", async () => {
    const embed = vi.fn(async () => ({ values: [1, 0], dims: 2, model: "m" }));
    await evaluateRetrieval([{ label: "c", expectedCatalogItemId: "a", queryImage: IMAGE }], {
      embeddingProvider: { id: "m", embed },
      retriever: retrieverReturning(["a"]),
    });
    expect(embed).toHaveBeenCalledWith(IMAGE, "query");
  });

  it("collects the top similarity score per case for the raw score distribution", async () => {
    const retriever = retrieverReturning(["a"]);
    const result = await evaluateRetrieval([{ label: "c", expectedCatalogItemId: "a", queryImage: IMAGE }], {
      embeddingProvider: embeddingProviderReturning(),
      retriever,
    });
    expect(result.similarityScores).toEqual([1]);
  });
});
