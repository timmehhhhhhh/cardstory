/**
 * CardEmbeddingIndexer — generates and persists vision embeddings for
 * cached reference-card images (docs/cardvision.md Phase 3), the step that
 * comes after Phase 2's CardReferenceIndexer (./reference-index.ts).
 *
 * Sources candidates from `catalogReferenceIndexer.listIndexableCards()`
 * and reads image bytes exclusively through
 * `catalogReferenceIndexer.getCachedReferenceImage(catalogItemId)` — the
 * one seam Phase 2 established for this purpose. Never queries Prisma for
 * image bytes directly, and never re-implements CatalogItem eligibility
 * (an item with no cached image yet is skipped here, not re-fetched — that
 * stays reference-index.ts's job).
 *
 * Mirrors reference-index.ts's shape deliberately: per-item errors are
 * caught and recorded in the result's `failed` count (or, for embedding
 * generation specifically, an explicit `status: "failed"` row with an
 * `error` message) rather than aborting the whole run, and repeat runs are
 * incremental (an item whose CardReferenceEmbedding row for the current
 * provider already exists is a cache hit, not regenerated).
 */
import { db } from "@/lib/db";
import { catalogReferenceIndexer } from "./reference-index";
import { encodeEmbeddingValues } from "./providers/embedding-codec";
import { EmbeddingProviderError } from "./providers/embedding-error";
import type { VisionEmbeddingProvider } from "./providers/types";
import { createVoyageEmbeddingProvider } from "./providers/voyage-embedding-provider";

export interface EmbeddingGenerationResult {
  /** Total CatalogItem rows the source query returned (before cached-image filtering). */
  examined: number;
  /** Candidates that already have a cached reference image to embed (see Phase 2's `indexedAt`). */
  eligible: number;
  /** Newly generated (or re-generated after this provider's row was missing/failed) this run. */
  generated: number;
  /** Already had a `status: "ready"` row for this exact provider — verified, not regenerated. */
  cacheHit: number;
  /** No cached reference image yet — Phase 2's rebuildIndex() hasn't processed this item. */
  skipped: number;
  /** embed() threw for this item — recorded as a `status: "failed"` row with `error` set, not retried automatically. */
  failed: number;
}

export interface CardEmbeddingIndexer {
  readonly id: string;
  /**
   * Generates embeddings for eligible CatalogItems, optionally narrowed to
   * one game or to rows synced since a given time (same filters as
   * CardReferenceIndexer.rebuildIndex). `limit` bounds how many items are
   * actually embedded (cache hits and skips don't count against it).
   */
  generateEmbeddings(input?: { gameId?: string; since?: Date; limit?: number }): Promise<EmbeddingGenerationResult>;
}

interface IndexableRecord {
  catalogItemId: string;
  gameId: string;
  variantKey: string;
  indexedAt: string | null;
}

/**
 * Generates (or re-verifies) one item's embedding for the given provider.
 * Never throws — an EmbeddingProviderError is caught and persisted as a
 * `status: "failed"` row so a future run can distinguish "never attempted"
 * from "attempted and failed, here's why", without retrying automatically
 * (that stays a human/ops decision, same as CardReferenceIndexer leaving
 * `failed`/`invalid` items for a re-run rather than looping internally).
 */
async function generateOneEmbedding(
  record: IndexableRecord,
  embeddingProvider: VisionEmbeddingProvider,
  stats: EmbeddingGenerationResult
): Promise<void> {
  // EmbeddingVector.model is always set to the producing provider's own
  // `id` (see voyage-embedding-provider.ts), so this is an exact-match
  // lookup, not a prefix search — one deterministic identity throughout.
  const existing = await db.cardReferenceEmbedding.findUnique({
    where: { catalogItemId_variantKey_provider: { catalogItemId: record.catalogItemId, variantKey: record.variantKey, provider: embeddingProvider.id } },
    select: { id: true, status: true },
  });
  if (existing?.status === "ready") {
    stats.cacheHit += 1;
    return;
  }

  const cached = await catalogReferenceIndexer.getCachedReferenceImage(record.catalogItemId);
  if (!cached) {
    // Phase 2 hasn't actually cached bytes for this item yet, despite
    // listIndexableCards() considering it eligible (e.g. indexedAt was
    // stale/racing with a concurrent rebuildIndex run) — treat as skipped,
    // not failed, since this isn't this item's embedding fault.
    stats.skipped += 1;
    return;
  }

  try {
    const embedding = await embeddingProvider.embed(
      { kind: "inline", base64: Buffer.from(cached.data).toString("base64"), mimeType: cached.contentType },
      "document"
    );
    if (!embedding) {
      // Provider not configured (e.g. no API key) — nothing to persist;
      // distinct from a real failure, so it's a skip, not a failed row.
      stats.skipped += 1;
      return;
    }

    // Wrapped in Buffer.from(...) (not passed as the raw Uint8Array
    // encodeEmbeddingValues returns) — matches reference-index.ts's own
    // `Buffer.from(outcome.data)` convention for a Prisma Bytes field, and
    // is required here specifically: this tsconfig's lib target infers
    // `new Uint8Array(n)` as `Uint8Array<ArrayBufferLike>`, which Prisma's
    // generated `Uint8Array<ArrayBuffer>` field type rejects, while
    // `Buffer.from(...)` narrows back to the accepted type.
    const vectorBytes = Buffer.from(encodeEmbeddingValues(embedding.values));
    await db.cardReferenceEmbedding.upsert({
      where: { catalogItemId_variantKey_provider: { catalogItemId: record.catalogItemId, variantKey: record.variantKey, provider: embedding.model } },
      create: {
        catalogItemId: record.catalogItemId,
        gameId: record.gameId,
        variantKey: record.variantKey,
        provider: embedding.model,
        dims: embedding.dims,
        vector: vectorBytes,
        status: "ready",
        error: null,
      },
      update: {
        dims: embedding.dims,
        vector: vectorBytes,
        status: "ready",
        error: null,
      },
    });
    stats.generated += 1;
  } catch (err) {
    const message =
      err instanceof EmbeddingProviderError
        ? `${err.code}: ${err.message}`
        : err instanceof Error
          ? err.message
          : "Embedding generation failed";

    // The exact provider identity isn't known when embed() throws before
    // returning a vector (e.g. the HTTP call itself failed) — record the
    // failure under the provider's own `id` so it's still queryable/
    // regenerable, distinct from any successfully-embedded model's rows.
    await db.cardReferenceEmbedding.upsert({
      where: { catalogItemId_variantKey_provider: { catalogItemId: record.catalogItemId, variantKey: record.variantKey, provider: embeddingProvider.id } },
      create: {
        catalogItemId: record.catalogItemId,
        gameId: record.gameId,
        variantKey: record.variantKey,
        provider: embeddingProvider.id,
        dims: 0,
        vector: Buffer.alloc(0),
        status: "failed",
        error: message,
      },
      update: { status: "failed", error: message, dims: 0, vector: Buffer.alloc(0) },
    });
    stats.failed += 1;
  }
}

export function createCardEmbeddingIndexer(embeddingProvider: VisionEmbeddingProvider = createVoyageEmbeddingProvider()): CardEmbeddingIndexer {
  return {
    id: `cardvision-embedding-indexer-${embeddingProvider.id}`,

    async generateEmbeddings(input = {}): Promise<EmbeddingGenerationResult> {
      const stats: EmbeddingGenerationResult = { examined: 0, eligible: 0, generated: 0, cacheHit: 0, skipped: 0, failed: 0 };

      const records = await catalogReferenceIndexer.listIndexableCards({ gameId: input.gameId, since: input.since });
      stats.examined = records.length;

      const eligible = records.filter((r) => r.indexedAt != null);
      stats.skipped = records.length - eligible.length;
      stats.eligible = eligible.length;

      const bounded = input.limit != null ? eligible.slice(0, input.limit) : eligible;

      for (const record of bounded) {
        try {
          await generateOneEmbedding(record, embeddingProvider, stats);
        } catch (err) {
          // Unexpected error outside generateOneEmbedding's own try/catch
          // (e.g. a DB hiccup on the cache-hit lookup itself) — still must
          // not abort the whole run, mirroring reference-index.ts's
          // rebuildIndex outer guard.
          console.error("[cardvision] embedding-index: unexpected error embedding", record.catalogItemId, err);
          stats.failed += 1;
        }
      }

      return stats;
    },
  };
}
