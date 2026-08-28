/**
 * CardReferenceIndexer — CardVision's persistent reference library of
 * CatalogItem images (docs/cardvision.md's Phase 2/3). THE CARDSTORY
 * CATALOG (CatalogItem, prisma/schema.prisma) REMAINS THE SOURCE OF
 * TRUTH: this file never creates a second card database —
 * `CardReferenceRecord.catalogItemId` is always an existing
 * `CatalogItem.id` ("<gameId>:<externalId>", see src/lib/catalog/by-ids.ts),
 * and `listIndexableCards` reads directly from the catalog rather than a
 * mirrored table.
 *
 * Reference images live on pokemontcg.io/tcgdex CDNs (CatalogItem.
 * imageSmallUrl/imageLargeUrl are plain URLs — this app has no R2/object
 * storage binding, see wrangler.jsonc), and Cloudflare Workers has no
 * writable local filesystem at runtime, so `rebuildIndex` downloads each
 * image and caches its bytes in Postgres (CardReferenceImage /
 * CardReferenceImageLink, prisma/schema.prisma) rather than a local cache
 * directory — the app's existing persistence, not a new technology.
 *
 * Deliberately domain-agnostic: nothing below reads a game-specific
 * CatalogItem field (no Pokédex numbers, no card-type matching) — it only
 * ever touches the generic identity/image columns every CatalogItem has,
 * so the same indexer works for Pokémon, MTG, sports cards, or any future
 * game without change.
 *
 * Phase 2 does NOT generate embeddings — `getCachedReferenceImage` is the
 * seam a future VisionEmbeddingProvider (providers/types.ts) will read
 * cached bytes through; embedding generation itself stays Phase 3's job
 * (see providers/null-embedding-provider.ts).
 */
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import type { EmbeddingVector } from "./providers/types";
import { fetchImageBytes, isValidImageUrl } from "./reference-image-fetch";

export interface CardReferenceRecord {
  /** Always an existing CatalogItem.id — never a new id scheme. */
  catalogItemId: string;
  gameId: string;
  /** CatalogItem.variantKey — which priced finish/printing this reference image is for. */
  variantKey: string;
  /** The URL actually selected for this record — imageLargeUrl preferred, imageSmallUrl fallback. */
  imageUrl: string;
  /** Null until a real VisionEmbeddingProvider has processed this card — see providers/null-embedding-provider.ts. */
  embedding: EmbeddingVector | null;
  /** Null until this record's image has actually been downloaded and cached — see getIndexStatus/rebuildIndex. */
  indexedAt: string | null;
}

export interface IndexStatus {
  /** Count of CatalogItem rows with at least one non-null image URL — the indexable pool. */
  indexableCount: number;
  /** Count of CatalogItem rows with at least one cached CardReferenceImageLink. */
  indexedCount: number;
  /** Most recent CardReferenceImageLink.lastCheckedAt across the whole cache, or null if nothing has ever been indexed. */
  lastRebuildAt: string | null;
}

export interface IndexRebuildResult {
  /** Total CatalogItem rows the candidate query returned (before eligibility filtering). */
  examined: number;
  /** Candidates with a usable image URL to attempt. */
  eligible: number;
  /** Newly fetched and cached (or re-fetched after a URL change) this run. */
  downloaded: number;
  /** Already cached and unchanged — verified, not re-fetched. */
  cacheHit: number;
  /** No image URL at all. */
  skipped: number;
  /** Retryable-class failure (network error, timeout, persistent bad HTTP status) that exhausted its retries. */
  failed: number;
  /** Non-retryable problem: malformed URL, non-image response, or a corrupted/empty body. */
  invalid: number;
  /** Cache links removed because their CatalogItem is gone or no longer has any image URL. */
  removedLinks: number;
  reason: string | null;
}

export interface CardReferenceIndexer {
  readonly id: string;
  /** Lists CatalogItem rows eligible to be indexed — optionally narrowed to one game or to rows synced since a given time, for incremental indexing of newly-added sets. */
  listIndexableCards(input?: { gameId?: string; since?: Date }): Promise<CardReferenceRecord[]>;
  getIndexStatus(): Promise<IndexStatus>;
  /**
   * Rebuilds (or incrementally updates, when `gameId`/`since` are given)
   * the reference image cache: downloads new/changed images, skips
   * unchanged ones, and sweeps cache entries whose CatalogItem is gone or
   * lost its image. `limit` bounds how many new/changed items are
   * processed in one call (a future bounded/route-driven caller's knob —
   * this phase's own CLI caller runs unbounded).
   */
  rebuildIndex(input?: { gameId?: string; since?: Date; limit?: number }): Promise<IndexRebuildResult>;
  /**
   * Phase 3 seam: raw cached bytes for a CatalogItem, for a future
   * VisionEmbeddingProvider.embed() call to consume. Prefers the "large"
   * link, falls back to "small". Returns null if nothing is cached yet.
   */
  getCachedReferenceImage(catalogItemId: string): Promise<{ data: Uint8Array; contentType: string; sourceUrl: string } | null>;
}

type ReferenceImageSize = "large" | "small";

interface CandidateItem {
  id: string;
  gameId: string;
  variantKey: string;
  imageSmallUrl: string | null;
  imageLargeUrl: string | null;
}

async function queryIndexableCatalogItems(input: { gameId?: string; since?: Date } = {}): Promise<CandidateItem[]> {
  return db.catalogItem.findMany({
    where: {
      OR: [{ imageSmallUrl: { not: null } }, { imageLargeUrl: { not: null } }],
      ...(input.gameId ? { gameId: input.gameId } : {}),
      ...(input.since ? { lastSyncedAt: { gte: input.since } } : {}),
    },
    select: { id: true, gameId: true, variantKey: true, imageSmallUrl: true, imageLargeUrl: true },
  });
}

/** Prefers imageLargeUrl (higher quality), falls back to imageSmallUrl. Never selects both — a fetch failure on the chosen URL falls back to the other within the same rebuildIndex pass, see below. */
function selectReferenceImageUrl(item: CandidateItem): { url: string; size: ReferenceImageSize } | null {
  if (item.imageLargeUrl) return { url: item.imageLargeUrl, size: "large" };
  if (item.imageSmallUrl) return { url: item.imageSmallUrl, size: "small" };
  return null;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

type FetchAndCacheResult = { kind: "ok"; imageId: string } | { kind: "invalid" } | { kind: "failed" };

/**
 * Downloads and caches one CatalogItem's reference image, or confirms an
 * existing cache entry is still valid. Never throws — every outcome
 * (cache hit, download, failure, invalid) is reported back via the
 * `stats` accumulator so a single bad item can't abort the whole run.
 */
async function indexOneCandidate(item: CandidateItem, stats: IndexRebuildResult, fetchCache: Map<string, Promise<FetchAndCacheResult>>): Promise<void> {
  const selected = selectReferenceImageUrl(item);
  if (!selected) {
    stats.skipped += 1;
    return;
  }
  stats.eligible += 1;

  const existingLink = await db.cardReferenceImageLink.findUnique({
    where: { catalogItemId_size: { catalogItemId: item.id, size: selected.size } },
    select: { id: true, sourceUrlAtSync: true, imageId: true },
  });

  if (existingLink && existingLink.sourceUrlAtSync === selected.url) {
    // Confirm the image row this link points at is still there (it always
    // should be — links cascade-delete with their image — but a stale
    // read shouldn't be reported as a hit if it isn't).
    const stillCached = await db.cardReferenceImage.findUnique({ where: { id: existingLink.imageId }, select: { id: true } });
    if (stillCached) {
      await db.cardReferenceImageLink.update({ where: { id: existingLink.id }, data: { lastCheckedAt: new Date() } });
      stats.cacheHit += 1;
      return;
    }
  }

  const outcome = await fetchAndCache(selected.url, fetchCache);
  if (outcome.kind === "ok") {
    await upsertLink(item, selected.size, selected.url, outcome.imageId);
    stats.downloaded += 1;
    return;
  }

  // Fall back to the other size once, within this same run, if the
  // preferred URL failed rather than was simply absent.
  const fallbackUrl = selected.size === "large" ? item.imageSmallUrl : null;
  if (fallbackUrl && isValidImageUrl(fallbackUrl)) {
    const fallbackOutcome = await fetchAndCache(fallbackUrl, fetchCache);
    if (fallbackOutcome.kind === "ok") {
      await upsertLink(item, "small", fallbackUrl, fallbackOutcome.imageId);
      stats.downloaded += 1;
      return;
    }
  }

  if (outcome.kind === "invalid") stats.invalid += 1;
  else stats.failed += 1;
}

/**
 * Fetches + caches a URL, memoized per rebuildIndex() call via
 * `fetchCache` — so two CatalogItems sharing the same source URL in one
 * run trigger exactly one HTTP request, not two (the brief's "avoid
 * duplicate downloads" requirement), rather than relying solely on the
 * content-hash dedup below to avoid a *second run's* redundant work.
 */
async function fetchAndCache(url: string, fetchCache: Map<string, Promise<FetchAndCacheResult>>): Promise<FetchAndCacheResult> {
  const cached = fetchCache.get(url);
  if (cached) return cached;
  const promise = fetchAndCacheUncached(url);
  fetchCache.set(url, promise);
  return promise;
}

async function fetchAndCacheUncached(url: string): Promise<FetchAndCacheResult> {
  const outcome = await fetchImageBytes(url);
  if (outcome.kind !== "ok") return { kind: outcome.kind };

  const contentHash = sha256Hex(outcome.data);
  const existing = await db.cardReferenceImage.findUnique({
    where: { sourceUrl_contentHash: { sourceUrl: url, contentHash } },
    select: { id: true },
  });
  if (existing) return { kind: "ok", imageId: existing.id };

  const created = await db.cardReferenceImage.create({
    data: {
      sourceUrl: url,
      contentHash,
      data: Buffer.from(outcome.data),
      contentType: outcome.contentType,
      byteSize: outcome.data.length,
    },
    select: { id: true },
  });
  return { kind: "ok", imageId: created.id };
}

async function upsertLink(item: CandidateItem, size: ReferenceImageSize, sourceUrl: string, imageId: string): Promise<void> {
  await db.cardReferenceImageLink.upsert({
    where: { catalogItemId_size: { catalogItemId: item.id, size } },
    create: { catalogItemId: item.id, gameId: item.gameId, size, imageId, sourceUrlAtSync: sourceUrl },
    update: { imageId, sourceUrlAtSync: sourceUrl, lastCheckedAt: new Date() },
  });
}

/**
 * Removes cache links whose CatalogItem is gone, or whose CatalogItem no
 * longer has any image URL at all. Never deletes the underlying
 * CardReferenceImage row (other CatalogItems, or a future re-add, may
 * still reference the same bytes) — only the per-item link.
 */
async function sweepOrphanLinks(gameId?: string): Promise<number> {
  const links = await db.cardReferenceImageLink.findMany({
    where: gameId ? { gameId } : {},
    select: { id: true, catalogItemId: true },
  });
  if (links.length === 0) return 0;

  const catalogItemIds = [...new Set(links.map((l) => l.catalogItemId))];
  const liveItems = await db.catalogItem.findMany({
    where: { id: { in: catalogItemIds } },
    select: { id: true, imageSmallUrl: true, imageLargeUrl: true },
  });
  const liveById = new Map(liveItems.map((i) => [i.id, i]));

  const orphanLinkIds = links
    .filter((l) => {
      const item = liveById.get(l.catalogItemId);
      return !item || (!item.imageSmallUrl && !item.imageLargeUrl);
    })
    .map((l) => l.id);
  if (orphanLinkIds.length === 0) return 0;

  const res = await db.cardReferenceImageLink.deleteMany({ where: { id: { in: orphanLinkIds } } });
  return res.count;
}

export const catalogReferenceIndexer: CardReferenceIndexer = {
  id: "cardvision-catalog-reference-indexer",

  async listIndexableCards(input = {}): Promise<CardReferenceRecord[]> {
    const rows = await queryIndexableCatalogItems(input);
    const catalogItemIds = rows.map((r) => r.id);
    const links =
      catalogItemIds.length === 0
        ? []
        : await db.cardReferenceImageLink.findMany({
            where: { catalogItemId: { in: catalogItemIds } },
            select: { catalogItemId: true, size: true, lastCheckedAt: true },
          });
    const indexedAtByItem = new Map<string, string>();
    for (const link of links) {
      // Prefer "large"'s timestamp when both sizes are cached, matching selectReferenceImageUrl's preference.
      if (link.size === "large" || !indexedAtByItem.has(link.catalogItemId)) {
        indexedAtByItem.set(link.catalogItemId, link.lastCheckedAt.toISOString());
      }
    }

    return rows
      .map((row) => ({ row, selected: selectReferenceImageUrl(row) }))
      .filter((r): r is { row: CandidateItem; selected: { url: string; size: ReferenceImageSize } } => r.selected != null)
      .map(({ row, selected }) => ({
        catalogItemId: row.id,
        gameId: row.gameId,
        variantKey: row.variantKey,
        imageUrl: selected.url,
        embedding: null,
        indexedAt: indexedAtByItem.get(row.id) ?? null,
      }));
  },

  async getIndexStatus(): Promise<IndexStatus> {
    const [indexableCount, indexedCount, mostRecent] = await Promise.all([
      db.catalogItem.count({ where: { OR: [{ imageSmallUrl: { not: null } }, { imageLargeUrl: { not: null } }] } }),
      db.cardReferenceImageLink.findMany({ select: { catalogItemId: true }, distinct: ["catalogItemId"] }).then((r) => r.length),
      db.cardReferenceImageLink.findFirst({ orderBy: { lastCheckedAt: "desc" }, select: { lastCheckedAt: true } }),
    ]);
    return { indexableCount, indexedCount, lastRebuildAt: mostRecent?.lastCheckedAt.toISOString() ?? null };
  },

  async rebuildIndex(input = {}): Promise<IndexRebuildResult> {
    const stats: IndexRebuildResult = {
      examined: 0,
      eligible: 0,
      downloaded: 0,
      cacheHit: 0,
      skipped: 0,
      failed: 0,
      invalid: 0,
      removedLinks: 0,
      reason: null,
    };

    const candidates = await queryIndexableCatalogItems(input);
    stats.examined = candidates.length;

    // Memoizes fetches by URL across this whole run — see fetchAndCache's
    // doc comment.
    const fetchCache = new Map<string, Promise<FetchAndCacheResult>>();

    const bounded = input.limit != null ? candidates.slice(0, input.limit) : candidates;
    for (const candidate of bounded) {
      // A single item's failure must never abort the run — indexOneCandidate
      // classifies failures into stats instead of throwing, but guard here
      // too in case of an unexpected error (e.g. a DB hiccup) so the loop
      // always finishes and reports what it could.
      try {
        await indexOneCandidate(candidate, stats, fetchCache);
      } catch (err) {
        console.error("[cardvision] reference-index: unexpected error indexing", candidate.id, err);
        stats.failed += 1;
      }
    }

    stats.removedLinks = await sweepOrphanLinks(input.gameId);

    return stats;
  },

  async getCachedReferenceImage(catalogItemId: string) {
    const links = await db.cardReferenceImageLink.findMany({
      where: { catalogItemId },
      select: { size: true, sourceUrlAtSync: true, image: { select: { data: true, contentType: true } } },
    });
    if (links.length === 0) return null;
    const preferred = links.find((l) => l.size === "large") ?? links[0];
    return {
      data: new Uint8Array(preferred.image.data),
      contentType: preferred.image.contentType,
      sourceUrl: preferred.sourceUrlAtSync,
    };
  },
};
