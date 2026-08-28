import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * @/lib/db is mocked at the module boundary, same convention as
 * reference-index.test.ts — a small in-memory fake for the two tables this
 * retriever (via getCatalogItemsByIds) actually touches:
 * cardReferenceEmbedding and catalogItem (including its `set` join, which
 * getCatalogItemsByIds needs for `setName`).
 */
interface FakeEmbeddingRow {
  catalogItemId: string;
  gameId: string;
  variantKey: string;
  provider: string;
  dims: number;
  vector: Uint8Array;
  status: string;
}

interface FakeCatalogItem {
  id: string;
  gameId: string;
  name: string;
  number: string | null;
  imageSmallUrl: string | null;
  set: { name: string };
}

const { state, resetState, fakeDb } = vi.hoisted(() => {
  const state = {
    embeddings: [] as FakeEmbeddingRow[],
    catalogItems: [] as FakeCatalogItem[],
  };

  function resetState() {
    state.embeddings = [];
    state.catalogItems = [];
  }

  const fakeDb = {
    cardReferenceEmbedding: {
      findMany: async ({
        where,
      }: {
        where: { provider: string; status: string; gameId?: string };
      }) => {
        return state.embeddings
          .filter((r) => r.provider === where.provider && r.status === where.status)
          .filter((r) => !where.gameId || r.gameId === where.gameId)
          .map((r) => ({ ...r }));
      },
    },
    catalogItem: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        state.catalogItems.filter((c) => where.id.in.includes(c.id)).map((c) => ({ ...c })),
    },
  };

  return { state, resetState, fakeDb };
});

vi.mock("@/lib/db", () => ({ db: fakeDb }));

const { encodeEmbeddingValues } = await import("./embedding-codec");
const { embeddingSimilarityRetriever } = await import("./embedding-similarity-retriever");

function addCatalogItem(overrides: Partial<FakeCatalogItem> = {}): FakeCatalogItem {
  const item: FakeCatalogItem = {
    id: "pokemon:base1-4",
    gameId: "pokemon",
    name: "Charizard",
    number: "4",
    imageSmallUrl: "https://images.example/small/base1-4.png",
    set: { name: "Base Set" },
    ...overrides,
  };
  state.catalogItems.push(item);
  return item;
}

function addEmbedding(values: number[], overrides: Partial<Omit<FakeEmbeddingRow, "vector" | "dims">> = {}): void {
  state.embeddings.push({
    catalogItemId: "pokemon:base1-4",
    gameId: "pokemon",
    variantKey: "",
    provider: "cardvision-voyage-voyage-multimodal-3.5",
    status: "ready",
    dims: values.length,
    vector: encodeEmbeddingValues(values),
    ...overrides,
  });
}

beforeEach(() => {
  resetState();
});

describe("embeddingSimilarityRetriever", () => {
  it("returns [] immediately when the query has no embedding", async () => {
    const result = await embeddingSimilarityRetriever.retrieve({ embedding: null, ocr: null });
    expect(result).toEqual([]);
  });

  it("returns the closest match ranked first, with visualSimilarity set and other signals null", async () => {
    addCatalogItem({ id: "pokemon:base1-4", name: "Charizard" });
    addCatalogItem({ id: "pokemon:base1-58", name: "Pikachu" });
    addEmbedding([1, 0, 0], { catalogItemId: "pokemon:base1-4" });
    addEmbedding([0, 1, 0], { catalogItemId: "pokemon:base1-58" });

    const result = await embeddingSimilarityRetriever.retrieve({
      embedding: { values: [0.9, 0.1, 0], dims: 3, model: "cardvision-voyage-voyage-multimodal-3.5" },
      ocr: null,
    });

    expect(result[0].catalogItemId).toBe("pokemon:base1-4");
    expect(result[0].name).toBe("Charizard");
    expect(result[0].visualSimilarity).toBeGreaterThan(0.9);
    expect(result[0].ocrScore).toBeNull();
    expect(result[0].metadataScore).toBeNull();
    expect(result[0].score).toBe(result[0].visualSimilarity);
    expect(result[1].catalogItemId).toBe("pokemon:base1-58");
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it("never compares embeddings from a different provider/model", async () => {
    addCatalogItem({ id: "pokemon:base1-4" });
    addEmbedding([1, 0, 0], { catalogItemId: "pokemon:base1-4", provider: "cardvision-null-embedding-v0" });

    const result = await embeddingSimilarityRetriever.retrieve({
      embedding: { values: [1, 0, 0], dims: 3, model: "cardvision-voyage-voyage-multimodal-3.5" },
      ocr: null,
    });

    expect(result).toEqual([]);
  });

  it("excludes rows whose status is not 'ready' (a failed embedding generation)", async () => {
    addCatalogItem({ id: "pokemon:base1-4" });
    addEmbedding([1, 0, 0], { catalogItemId: "pokemon:base1-4", status: "failed" });

    const result = await embeddingSimilarityRetriever.retrieve({
      embedding: { values: [1, 0, 0], dims: 3, model: "cardvision-voyage-voyage-multimodal-3.5" },
      ocr: null,
    });

    expect(result).toEqual([]);
  });

  it("narrows by gameHint when provided", async () => {
    addCatalogItem({ id: "pokemon:base1-4", gameId: "pokemon" });
    addCatalogItem({ id: "mtg:alpha-1", gameId: "mtg" });
    addEmbedding([1, 0], { catalogItemId: "pokemon:base1-4", gameId: "pokemon" });
    addEmbedding([1, 0], { catalogItemId: "mtg:alpha-1", gameId: "mtg" });

    const result = await embeddingSimilarityRetriever.retrieve({
      embedding: { values: [1, 0], dims: 2, model: "cardvision-voyage-voyage-multimodal-3.5" },
      ocr: null,
      gameHint: "mtg",
    });

    expect(result.map((c) => c.catalogItemId)).toEqual(["mtg:alpha-1"]);
  });

  it("skips a row whose dims disagree with the query embedding rather than throwing", async () => {
    addCatalogItem({ id: "pokemon:base1-4" });
    addEmbedding([1, 0, 0, 0], { catalogItemId: "pokemon:base1-4" }); // 4 dims

    const result = await embeddingSimilarityRetriever.retrieve({
      embedding: { values: [1, 0, 0], dims: 3, model: "cardvision-voyage-voyage-multimodal-3.5" }, // 3 dims
      ocr: null,
    });

    expect(result).toEqual([]);
  });

  it("respects the requested limit", async () => {
    for (let i = 0; i < 5; i++) {
      addCatalogItem({ id: `pokemon:item-${i}`, name: `Card ${i}` });
      addEmbedding([1 - i * 0.01, 0], { catalogItemId: `pokemon:item-${i}` });
    }

    const result = await embeddingSimilarityRetriever.retrieve({
      embedding: { values: [1, 0], dims: 2, model: "cardvision-voyage-voyage-multimodal-3.5" },
      ocr: null,
      limit: 2,
    });

    expect(result).toHaveLength(2);
  });

  it("skips an embedding row whose CatalogItem no longer exists", async () => {
    // No addCatalogItem call — the embedding row is orphaned.
    addEmbedding([1, 0], { catalogItemId: "pokemon:deleted-item" });

    const result = await embeddingSimilarityRetriever.retrieve({
      embedding: { values: [1, 0], dims: 2, model: "cardvision-voyage-voyage-multimodal-3.5" },
      ocr: null,
    });

    expect(result).toEqual([]);
  });
});
