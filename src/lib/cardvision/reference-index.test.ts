import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * @/lib/db is mocked at the module boundary (same convention as
 * src/lib/pc/manage.test.ts) with a small in-memory fake standing in for
 * the three tables reference-index.ts touches (catalogItem,
 * cardReferenceImage, cardReferenceImageLink). This exercises the real
 * indexing/dedup/incremental logic end-to-end without a real Postgres —
 * only the storage layer is faked, everything reference-index.ts itself
 * decides is real.
 */

interface FakeCatalogItem {
  id: string;
  gameId: string;
  variantKey: string;
  imageSmallUrl: string | null;
  imageLargeUrl: string | null;
  lastSyncedAt: Date;
}

interface FakeImage {
  id: string;
  sourceUrl: string;
  contentHash: string;
  data: Buffer;
  contentType: string;
  byteSize: number;
  fetchedAt: Date;
}

interface FakeLink {
  id: string;
  catalogItemId: string;
  gameId: string;
  size: string;
  imageId: string;
  sourceUrlAtSync: string;
  lastCheckedAt: Date;
}

const { state, resetState, fakeDb } = vi.hoisted(() => {
  const state = {
    catalogItems: [] as FakeCatalogItem[],
    images: [] as FakeImage[],
    links: [] as FakeLink[],
    idCounter: 0,
  };

  function resetState() {
    state.catalogItems = [];
    state.images = [];
    state.links = [];
    state.idCounter = 0;
  }

  interface CatalogItemWhere {
    OR?: Record<string, { not: null }>[];
    gameId?: string;
    lastSyncedAt?: { gte: Date };
    id?: { in: string[] };
  }

  interface LinkWhere {
    gameId?: string;
    catalogItemId?: string | { in: string[] };
  }

  function matchOr(item: FakeCatalogItem, or: Record<string, { not: null }>[]): boolean {
    return or.some((cond) =>
      Object.entries(cond).every(([key, val]) => (val.not === null ? item[key as keyof FakeCatalogItem] != null : true))
    );
  }

  function filterCatalogItems(where?: CatalogItemWhere): FakeCatalogItem[] {
    return state.catalogItems.filter((item) => {
      if (where?.OR && !matchOr(item, where.OR)) return false;
      if (where?.gameId && item.gameId !== where.gameId) return false;
      if (where?.lastSyncedAt?.gte && item.lastSyncedAt.getTime() < where.lastSyncedAt.gte.getTime()) return false;
      if (where?.id?.in && !where.id.in.includes(item.id)) return false;
      return true;
    });
  }

  function filterLinks(where?: LinkWhere): FakeLink[] {
    return state.links.filter((l) => {
      if (!where) return true;
      if (where.gameId && l.gameId !== where.gameId) return false;
      if (typeof where.catalogItemId === "string" && l.catalogItemId !== where.catalogItemId) return false;
      if (where.catalogItemId && typeof where.catalogItemId !== "string" && !where.catalogItemId.in.includes(l.catalogItemId))
        return false;
      return true;
    });
  }

  function withImage(l: FakeLink) {
    const image = state.images.find((i) => i.id === l.imageId);
    return { ...l, image: image ? { ...image } : undefined };
  }

  const fakeDb = {
    catalogItem: {
      findMany: async ({ where }: { where?: CatalogItemWhere }) => filterCatalogItems(where).map((i) => ({ ...i })),
      count: async ({ where }: { where?: CatalogItemWhere }) => filterCatalogItems(where).length,
    },
    cardReferenceImageLink: {
      findUnique: async ({ where }: { where: { catalogItemId_size: { catalogItemId: string; size: string } } }) => {
        const { catalogItemId, size } = where.catalogItemId_size;
        const found = state.links.find((l) => l.catalogItemId === catalogItemId && l.size === size);
        return found ? { ...found } : null;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<FakeLink> }) => {
        const l = state.links.find((x) => x.id === where.id);
        if (!l) throw new Error(`fake db: link ${where.id} not found`);
        Object.assign(l, data);
        return { ...l };
      },
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { catalogItemId_size: { catalogItemId: string; size: string } };
        create: Omit<FakeLink, "id" | "lastCheckedAt">;
        update: Partial<FakeLink>;
      }) => {
        const { catalogItemId, size } = where.catalogItemId_size;
        let l = state.links.find((x) => x.catalogItemId === catalogItemId && x.size === size);
        if (l) {
          Object.assign(l, update);
        } else {
          l = {
            id: `link-${++state.idCounter}`,
            catalogItemId,
            gameId: create.gameId,
            size,
            imageId: create.imageId,
            sourceUrlAtSync: create.sourceUrlAtSync,
            lastCheckedAt: new Date(),
          };
          state.links.push(l);
        }
        return { ...l };
      },
      findMany: async ({ where, distinct }: { where?: LinkWhere; distinct?: string[] } = {}) => {
        let filtered = filterLinks(where);
        if (distinct) {
          const seen = new Set<string>();
          filtered = filtered.filter((l) => {
            if (seen.has(l.catalogItemId)) return false;
            seen.add(l.catalogItemId);
            return true;
          });
        }
        return filtered.map(withImage);
      },
      findFirst: async ({ orderBy }: { orderBy?: { lastCheckedAt: "asc" | "desc" } } = {}) => {
        if (state.links.length === 0) return null;
        const dir = orderBy?.lastCheckedAt === "desc" ? -1 : 1;
        const sorted = [...state.links].sort((a, b) => dir * (a.lastCheckedAt.getTime() - b.lastCheckedAt.getTime()));
        return { ...sorted[0] };
      },
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        const ids = where.id.in;
        const before = state.links.length;
        state.links = state.links.filter((l) => !ids.includes(l.id));
        return { count: before - state.links.length };
      },
    },
    cardReferenceImage: {
      findUnique: async ({
        where,
      }: {
        where: { sourceUrl_contentHash: { sourceUrl: string; contentHash: string } } | { id: string };
      }) => {
        if ("sourceUrl_contentHash" in where) {
          const { sourceUrl, contentHash } = where.sourceUrl_contentHash;
          const found = state.images.find((i) => i.sourceUrl === sourceUrl && i.contentHash === contentHash);
          return found ? { ...found } : null;
        }
        const found = state.images.find((i) => i.id === where.id);
        return found ? { ...found } : null;
      },
      create: async ({ data }: { data: Omit<FakeImage, "id" | "fetchedAt"> }) => {
        const row: FakeImage = { id: `img-${++state.idCounter}`, fetchedAt: new Date(), ...data };
        state.images.push(row);
        return { ...row };
      },
    },
  };

  return { state, resetState, fakeDb };
});

vi.mock("@/lib/db", () => ({ db: fakeDb }));

const { catalogReferenceIndexer } = await import("./reference-index");

function makeCatalogItem(overrides: Partial<FakeCatalogItem> = {}): FakeCatalogItem {
  return {
    id: "pokemon:base1-4",
    gameId: "pokemon",
    variantKey: "",
    imageSmallUrl: "https://images.example/small/base1-4.png",
    imageLargeUrl: "https://images.example/large/base1-4.png",
    lastSyncedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function pngBytes(payload = "fake-image-bytes"): Uint8Array {
  const body = new TextEncoder().encode(payload);
  const combined = new Uint8Array(PNG_HEADER.length + body.length);
  combined.set(PNG_HEADER, 0);
  combined.set(body, PNG_HEADER.length);
  return combined;
}

function imageResponse(bytes: Uint8Array, contentType = "image/png", status = 200): Response {
  return new Response(bytes as BodyInit, { status, headers: { "content-type": contentType } });
}

function textResponse(status: number, body = "error"): Response {
  return new Response(body, { status });
}

beforeEach(() => {
  resetState();
  // Skip real backoff delays so retry tests run fast — same convention as src/lib/scan/claude.test.ts.
  vi.stubGlobal(
    "setTimeout",
    ((fn: () => void) => {
      fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("catalogReferenceIndexer.rebuildIndex", () => {
  it("downloads and caches a new item's reference image", async () => {
    state.catalogItems.push(makeCatalogItem());
    const fetchMock = vi.fn().mockResolvedValue(imageResponse(pngBytes()));
    vi.stubGlobal("fetch", fetchMock);

    const result = await catalogReferenceIndexer.rebuildIndex();

    expect(result).toMatchObject({ examined: 1, eligible: 1, downloaded: 1, cacheHit: 0, failed: 0, invalid: 0, skipped: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://images.example/large/base1-4.png", expect.anything());
    expect(state.images).toHaveLength(1);
    expect(state.links).toHaveLength(1);
    expect(state.links[0]).toMatchObject({ catalogItemId: "pokemon:base1-4", size: "large" });
  });

  it("is a cache hit on the second run and does not re-fetch", async () => {
    state.catalogItems.push(makeCatalogItem());
    const fetchMock = vi.fn().mockResolvedValue(imageResponse(pngBytes()));
    vi.stubGlobal("fetch", fetchMock);

    await catalogReferenceIndexer.rebuildIndex();
    const second = await catalogReferenceIndexer.rebuildIndex();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({ downloaded: 0, cacheHit: 1 });
  });

  it("repeated rebuildIndex() calls stay idempotent (no duplicate rows)", async () => {
    state.catalogItems.push(makeCatalogItem());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse(pngBytes())));

    await catalogReferenceIndexer.rebuildIndex();
    await catalogReferenceIndexer.rebuildIndex();
    await catalogReferenceIndexer.rebuildIndex();

    expect(state.images).toHaveLength(1);
    expect(state.links).toHaveLength(1);
  });

  it("honors `since` for incremental indexing", async () => {
    state.catalogItems.push(makeCatalogItem({ id: "pokemon:old", lastSyncedAt: new Date("2020-01-01") }));
    state.catalogItems.push(makeCatalogItem({ id: "pokemon:new", lastSyncedAt: new Date("2026-06-01") }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse(pngBytes())));

    const result = await catalogReferenceIndexer.rebuildIndex({ since: new Date("2026-01-01") });

    expect(result.examined).toBe(1);
    expect(state.links.map((l) => l.catalogItemId)).toEqual(["pokemon:new"]);
  });

  it("re-fetches when the image URL changes", async () => {
    const item = makeCatalogItem();
    state.catalogItems.push(item);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(imageResponse(pngBytes("v1")))
      .mockResolvedValueOnce(imageResponse(pngBytes("v2")));
    vi.stubGlobal("fetch", fetchMock);

    await catalogReferenceIndexer.rebuildIndex();
    item.imageLargeUrl = "https://images.example/large/base1-4-v2.png";
    const second = await catalogReferenceIndexer.rebuildIndex();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(second).toMatchObject({ downloaded: 1, cacheHit: 0 });
    // Old image row still exists — only the link was repointed.
    expect(state.images).toHaveLength(2);
    expect(state.links).toHaveLength(1);
    expect(state.links[0].sourceUrlAtSync).toBe("https://images.example/large/base1-4-v2.png");
  });

  it("skips a catalog item with no image URLs", async () => {
    state.catalogItems.push(makeCatalogItem({ imageSmallUrl: null, imageLargeUrl: null }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // The candidate query itself only selects items with at least one URL,
    // so this item is filtered out before reaching indexOneCandidate —
    // exercised here via examined/eligible both being 0.
    const result = await catalogReferenceIndexer.rebuildIndex();

    expect(result).toMatchObject({ examined: 0, eligible: 0, skipped: 0, downloaded: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports invalid for a malformed URL", async () => {
    state.catalogItems.push(makeCatalogItem({ imageLargeUrl: "not-a-url", imageSmallUrl: null }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await catalogReferenceIndexer.rebuildIndex();

    expect(result).toMatchObject({ eligible: 1, invalid: 1, downloaded: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports failed after a network error exhausts retries, without throwing", async () => {
    state.catalogItems.push(makeCatalogItem({ imageSmallUrl: null }));
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await catalogReferenceIndexer.rebuildIndex();

    expect(result).toMatchObject({ failed: 1, downloaded: 0, invalid: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries a transient 503 then succeeds", async () => {
    state.catalogItems.push(makeCatalogItem({ imageSmallUrl: null }));
    const fetchMock = vi.fn().mockResolvedValueOnce(textResponse(503)).mockResolvedValueOnce(imageResponse(pngBytes()));
    vi.stubGlobal("fetch", fetchMock);

    const result = await catalogReferenceIndexer.rebuildIndex();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ downloaded: 1 });
  });

  it("does not retry a non-retryable 404 and reports invalid", async () => {
    state.catalogItems.push(makeCatalogItem({ imageSmallUrl: null }));
    const fetchMock = vi.fn().mockResolvedValue(textResponse(404));
    vi.stubGlobal("fetch", fetchMock);

    const result = await catalogReferenceIndexer.rebuildIndex();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ invalid: 1, downloaded: 0, failed: 0 });
  });

  it("reports invalid for a corrupted/non-image body", async () => {
    state.catalogItems.push(makeCatalogItem({ imageSmallUrl: null }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } })));

    const result = await catalogReferenceIndexer.rebuildIndex();

    expect(result).toMatchObject({ invalid: 1, downloaded: 0, failed: 0 });
  });

  it("falls back to imageSmallUrl when imageLargeUrl fails", async () => {
    state.catalogItems.push(makeCatalogItem());
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(textResponse(404)) // large fails, non-retryable
      .mockResolvedValueOnce(imageResponse(pngBytes())); // small succeeds
    vi.stubGlobal("fetch", fetchMock);

    const result = await catalogReferenceIndexer.rebuildIndex();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ downloaded: 1, invalid: 0, failed: 0 });
    expect(state.links[0]).toMatchObject({ size: "small" });
  });

  it("dedupes a URL shared by two catalog items to a single fetch and a single stored image", async () => {
    const sharedUrl = "https://images.example/large/shared.png";
    state.catalogItems.push(makeCatalogItem({ id: "pokemon:a", imageLargeUrl: sharedUrl, imageSmallUrl: null }));
    state.catalogItems.push(makeCatalogItem({ id: "pokemon:b", imageLargeUrl: sharedUrl, imageSmallUrl: null }));
    const fetchMock = vi.fn().mockResolvedValue(imageResponse(pngBytes("shared")));
    vi.stubGlobal("fetch", fetchMock);

    const result = await catalogReferenceIndexer.rebuildIndex();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.downloaded).toBe(2);
    expect(state.images).toHaveLength(1);
    expect(state.links).toHaveLength(2);
    expect(new Set(state.links.map((l) => l.imageId)).size).toBe(1);
  });

  it("sweeps a link whose catalog item no longer exists", async () => {
    state.links.push({
      id: "link-orphan",
      catalogItemId: "pokemon:gone",
      gameId: "pokemon",
      size: "large",
      imageId: "img-orphan",
      sourceUrlAtSync: "https://images.example/gone.png",
      lastCheckedAt: new Date(),
    });
    state.images.push({
      id: "img-orphan",
      sourceUrl: "https://images.example/gone.png",
      contentHash: "hash",
      data: Buffer.from("x"),
      contentType: "image/png",
      byteSize: 1,
      fetchedAt: new Date(),
    });
    vi.stubGlobal("fetch", vi.fn());

    const result = await catalogReferenceIndexer.rebuildIndex();

    expect(result.removedLinks).toBe(1);
    expect(state.links).toHaveLength(0);
    // The underlying image row is left alone.
    expect(state.images).toHaveLength(1);
  });

  it("sweeps a link when its catalog item loses both image URLs", async () => {
    state.catalogItems.push(makeCatalogItem({ imageSmallUrl: null, imageLargeUrl: null }));
    state.links.push({
      id: "link-1",
      catalogItemId: "pokemon:base1-4",
      gameId: "pokemon",
      size: "large",
      imageId: "img-1",
      sourceUrlAtSync: "https://images.example/large/base1-4.png",
      lastCheckedAt: new Date(),
    });
    state.images.push({
      id: "img-1",
      sourceUrl: "https://images.example/large/base1-4.png",
      contentHash: "hash",
      data: Buffer.from("x"),
      contentType: "image/png",
      byteSize: 1,
      fetchedAt: new Date(),
    });
    vi.stubGlobal("fetch", vi.fn());

    const result = await catalogReferenceIndexer.rebuildIndex();

    expect(result.removedLinks).toBe(1);
    expect(state.links).toHaveLength(0);
  });
});

describe("catalogReferenceIndexer.getCachedReferenceImage", () => {
  it("returns cached bytes for an indexed item, preferring the large link", async () => {
    state.catalogItems.push(makeCatalogItem());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse(pngBytes("payload"))));
    await catalogReferenceIndexer.rebuildIndex();

    const cached = await catalogReferenceIndexer.getCachedReferenceImage("pokemon:base1-4");

    expect(cached).not.toBeNull();
    expect(cached?.contentType).toBe("image/png");
    expect(cached?.sourceUrl).toBe("https://images.example/large/base1-4.png");
    expect(Buffer.from(cached!.data).toString()).toContain("payload");
  });

  it("returns null when nothing is cached", async () => {
    const cached = await catalogReferenceIndexer.getCachedReferenceImage("pokemon:never-indexed");
    expect(cached).toBeNull();
  });
});

describe("catalogReferenceIndexer.getIndexStatus", () => {
  it("reflects indexable/indexed counts and the last rebuild time", async () => {
    state.catalogItems.push(makeCatalogItem({ id: "pokemon:a" }));
    state.catalogItems.push(makeCatalogItem({ id: "pokemon:b" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse(pngBytes())));

    const before = await catalogReferenceIndexer.getIndexStatus();
    expect(before).toMatchObject({ indexableCount: 2, indexedCount: 0, lastRebuildAt: null });

    await catalogReferenceIndexer.rebuildIndex({ gameId: "pokemon" });
    const after = await catalogReferenceIndexer.getIndexStatus();

    expect(after.indexableCount).toBe(2);
    expect(after.indexedCount).toBe(2);
    expect(after.lastRebuildAt).not.toBeNull();
  });
});

describe("catalogReferenceIndexer.listIndexableCards", () => {
  it("selects imageLargeUrl over imageSmallUrl and reports indexedAt once cached", async () => {
    state.catalogItems.push(makeCatalogItem());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse(pngBytes())));

    const before = await catalogReferenceIndexer.listIndexableCards();
    expect(before).toEqual([
      expect.objectContaining({ catalogItemId: "pokemon:base1-4", imageUrl: "https://images.example/large/base1-4.png", indexedAt: null }),
    ]);

    await catalogReferenceIndexer.rebuildIndex();
    const after = await catalogReferenceIndexer.listIndexableCards();
    expect(after[0].indexedAt).not.toBeNull();
  });
});
