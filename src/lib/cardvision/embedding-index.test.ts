import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmbeddingProviderError } from "./providers/embedding-error";
import type { EmbeddingVector, VisionEmbeddingProvider } from "./providers/types";

/**
 * Both @/lib/db (the CardReferenceEmbedding table this module writes) and
 * ./reference-index (Phase 2's indexer — the seam this module must read
 * image bytes exclusively through) are mocked at the module boundary, same
 * convention as reference-index.test.ts itself.
 */
interface FakeRow {
  catalogItemId: string;
  gameId: string;
  variantKey: string;
  provider: string;
  dims: number;
  vector: Buffer;
  status: string;
  error: string | null;
}

const { state, resetState, fakeDb } = vi.hoisted(() => {
  const state = { rows: [] as FakeRow[] };
  function resetState() {
    state.rows = [];
  }
  const fakeDb = {
    cardReferenceEmbedding: {
      findUnique: async ({
        where,
      }: {
        where: { catalogItemId_variantKey_provider: { catalogItemId: string; variantKey: string; provider: string } };
      }) => {
        const { catalogItemId, variantKey, provider } = where.catalogItemId_variantKey_provider;
        const found = state.rows.find((r) => r.catalogItemId === catalogItemId && r.variantKey === variantKey && r.provider === provider);
        return found ? { ...found } : null;
      },
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { catalogItemId_variantKey_provider: { catalogItemId: string; variantKey: string; provider: string } };
        create: FakeRow;
        update: Partial<FakeRow>;
      }) => {
        const { catalogItemId, variantKey, provider } = where.catalogItemId_variantKey_provider;
        let row = state.rows.find((r) => r.catalogItemId === catalogItemId && r.variantKey === variantKey && r.provider === provider);
        if (row) Object.assign(row, update);
        else {
          row = { ...create };
          state.rows.push(row);
        }
        return { ...row };
      },
    },
  };
  return { state, resetState, fakeDb };
});

vi.mock("@/lib/db", () => ({ db: fakeDb }));

const fakeIndexer = vi.hoisted(() => ({
  listIndexableCards: vi.fn(),
  getCachedReferenceImage: vi.fn(),
  getIndexStatus: vi.fn(),
  rebuildIndex: vi.fn(),
  id: "fake-catalog-reference-indexer",
}));
vi.mock("./reference-index", () => ({ catalogReferenceIndexer: fakeIndexer }));

const { createCardEmbeddingIndexer } = await import("./embedding-index");
const { decodeEmbeddingValues } = await import("./providers/embedding-codec");

function record(overrides: Partial<{ catalogItemId: string; gameId: string; variantKey: string; imageUrl: string; indexedAt: string | null }> = {}) {
  return {
    catalogItemId: "pokemon:base1-4",
    gameId: "pokemon",
    variantKey: "",
    imageUrl: "https://images.example/base1-4.png",
    embedding: null,
    indexedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function fakeProvider(overrides: Partial<VisionEmbeddingProvider> = {}): VisionEmbeddingProvider {
  return {
    id: "cardvision-fake-embedding",
    embed: vi.fn(async (): Promise<EmbeddingVector | null> => ({
      values: [0.1, 0.2, 0.3],
      dims: 3,
      model: "cardvision-fake-embedding",
    })),
    ...overrides,
  };
}

beforeEach(() => {
  resetState();
  fakeIndexer.listIndexableCards.mockReset();
  fakeIndexer.getCachedReferenceImage.mockReset();
});

describe("createCardEmbeddingIndexer", () => {
  it("skips items with no cached reference image yet (indexedAt null)", async () => {
    fakeIndexer.listIndexableCards.mockResolvedValue([record({ indexedAt: null })]);
    const indexer = createCardEmbeddingIndexer(fakeProvider());

    const result = await indexer.generateEmbeddings();

    expect(result).toMatchObject({ examined: 1, eligible: 0, skipped: 1, generated: 0, failed: 0 });
    expect(fakeIndexer.getCachedReferenceImage).not.toHaveBeenCalled();
  });

  it("reads image bytes exclusively through getCachedReferenceImage and persists a ready row", async () => {
    fakeIndexer.listIndexableCards.mockResolvedValue([record()]);
    fakeIndexer.getCachedReferenceImage.mockResolvedValue({
      data: new Uint8Array([1, 2, 3]),
      contentType: "image/png",
      sourceUrl: "https://images.example/base1-4.png",
    });
    const provider = fakeProvider();
    const indexer = createCardEmbeddingIndexer(provider);

    const result = await indexer.generateEmbeddings();

    expect(fakeIndexer.getCachedReferenceImage).toHaveBeenCalledWith("pokemon:base1-4");
    expect(provider.embed).toHaveBeenCalledWith(expect.objectContaining({ kind: "inline", mimeType: "image/png" }), "document");
    expect(result).toMatchObject({ examined: 1, eligible: 1, generated: 1, cacheHit: 0, skipped: 0, failed: 0 });

    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]).toMatchObject({ catalogItemId: "pokemon:base1-4", provider: provider.id, status: "ready", dims: 3 });
    // toBeCloseTo, not toEqual — the codec deliberately packs Float32 (see
    // embedding-codec.ts), which cannot represent 0.1/0.2/0.3 exactly.
    const decoded = decodeEmbeddingValues(state.rows[0].vector, 3);
    expect(decoded[0]).toBeCloseTo(0.1, 6);
    expect(decoded[1]).toBeCloseTo(0.2, 6);
    expect(decoded[2]).toBeCloseTo(0.3, 6);
  });

  it("is a cache hit (skips embed()) when a ready row for this exact provider already exists", async () => {
    fakeIndexer.listIndexableCards.mockResolvedValue([record()]);
    const provider = fakeProvider();
    state.rows.push({
      catalogItemId: "pokemon:base1-4",
      gameId: "pokemon",
      variantKey: "",
      provider: provider.id,
      dims: 3,
      vector: Buffer.alloc(12),
      status: "ready",
      error: null,
    });
    const indexer = createCardEmbeddingIndexer(provider);

    const result = await indexer.generateEmbeddings();

    expect(provider.embed).not.toHaveBeenCalled();
    expect(fakeIndexer.getCachedReferenceImage).not.toHaveBeenCalled();
    expect(result).toMatchObject({ cacheHit: 1, generated: 0 });
  });

  it("regenerates when the existing row for this provider previously failed", async () => {
    fakeIndexer.listIndexableCards.mockResolvedValue([record()]);
    fakeIndexer.getCachedReferenceImage.mockResolvedValue({ data: new Uint8Array([1]), contentType: "image/png", sourceUrl: "https://x" });
    const provider = fakeProvider();
    state.rows.push({
      catalogItemId: "pokemon:base1-4",
      gameId: "pokemon",
      variantKey: "",
      provider: provider.id,
      dims: 0,
      vector: Buffer.alloc(0),
      status: "failed",
      error: "previous failure",
    });
    const indexer = createCardEmbeddingIndexer(provider);

    const result = await indexer.generateEmbeddings();

    expect(result).toMatchObject({ generated: 1, cacheHit: 0 });
    expect(state.rows[0].status).toBe("ready");
  });

  it("skips (does not fail) when the provider isn't configured (embed() returns null)", async () => {
    fakeIndexer.listIndexableCards.mockResolvedValue([record()]);
    fakeIndexer.getCachedReferenceImage.mockResolvedValue({ data: new Uint8Array([1]), contentType: "image/png", sourceUrl: "https://x" });
    const provider = fakeProvider({ embed: vi.fn(async () => null) });
    const indexer = createCardEmbeddingIndexer(provider);

    const result = await indexer.generateEmbeddings();

    expect(result).toMatchObject({ skipped: 1, generated: 0, failed: 0 });
    expect(state.rows).toHaveLength(0);
  });

  it("skips (not fails) when Phase 2's cache is empty despite indexedAt being set (a race)", async () => {
    fakeIndexer.listIndexableCards.mockResolvedValue([record()]);
    fakeIndexer.getCachedReferenceImage.mockResolvedValue(null);
    const indexer = createCardEmbeddingIndexer(fakeProvider());

    const result = await indexer.generateEmbeddings();

    expect(result).toMatchObject({ eligible: 1, skipped: 1, generated: 0, failed: 0 });
  });

  it("records a per-item embed() failure as a failed row and continues, never aborting the run", async () => {
    fakeIndexer.listIndexableCards.mockResolvedValue([record({ catalogItemId: "a" }), record({ catalogItemId: "b" })]);
    fakeIndexer.getCachedReferenceImage.mockResolvedValue({ data: new Uint8Array([1]), contentType: "image/png", sourceUrl: "https://x" });
    let call = 0;
    const provider = fakeProvider({
      embed: vi.fn(async () => {
        call += 1;
        if (call === 1) throw new EmbeddingProviderError("EMBEDDING_RATE_LIMITED", "cardvision-fake-embedding", "rate limited");
        return { values: [1, 2], dims: 2, model: "cardvision-fake-embedding" };
      }),
    });
    const indexer = createCardEmbeddingIndexer(provider);

    const result = await indexer.generateEmbeddings();

    expect(result).toMatchObject({ examined: 2, generated: 1, failed: 1 });
    const failedRow = state.rows.find((r) => r.catalogItemId === "a");
    expect(failedRow).toMatchObject({ status: "failed" });
    expect(failedRow?.error).toContain("EMBEDDING_RATE_LIMITED");
    const readyRow = state.rows.find((r) => r.catalogItemId === "b");
    expect(readyRow).toMatchObject({ status: "ready" });
  });

  it("validates embedding dimensionality (dims persisted matches the actual vector length)", async () => {
    fakeIndexer.listIndexableCards.mockResolvedValue([record()]);
    fakeIndexer.getCachedReferenceImage.mockResolvedValue({ data: new Uint8Array([1]), contentType: "image/png", sourceUrl: "https://x" });
    const provider = fakeProvider({ embed: vi.fn(async () => ({ values: [1, 2, 3, 4, 5], dims: 5, model: "cardvision-fake-embedding" })) });
    const indexer = createCardEmbeddingIndexer(provider);

    await indexer.generateEmbeddings();

    expect(state.rows[0].dims).toBe(5);
    expect(decodeEmbeddingValues(state.rows[0].vector, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("respects limit, bounding only actually-processed (eligible) items", async () => {
    fakeIndexer.listIndexableCards.mockResolvedValue([
      record({ catalogItemId: "a" }),
      record({ catalogItemId: "b" }),
      record({ catalogItemId: "c" }),
    ]);
    fakeIndexer.getCachedReferenceImage.mockResolvedValue({ data: new Uint8Array([1]), contentType: "image/png", sourceUrl: "https://x" });
    const provider = fakeProvider();
    const indexer = createCardEmbeddingIndexer(provider);

    const result = await indexer.generateEmbeddings({ limit: 2 });

    expect(result).toMatchObject({ examined: 3, eligible: 3, generated: 2 });
    expect(provider.embed).toHaveBeenCalledTimes(2);
  });
});
