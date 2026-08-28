/**
 * CardReferenceIndexer — the abstraction for CardVision's future reference
 * library of known Pokémon card images/embeddings (docs/cardvision.md's
 * Phase 2/3). THE CARDSTORY CATALOG (CatalogItem, prisma/schema.prisma)
 * REMAINS THE SOURCE OF TRUTH: this file never creates a second card
 * database — `CardReferenceRecord.catalogItemId` is always an existing
 * `CatalogItem.id` ("<gameId>:<externalId>", see src/lib/catalog/by-ids.ts),
 * and `listIndexableCards` reads directly from the catalog rather than a
 * mirrored table.
 *
 * Reference images live on pokemontcg.io/tcgdex CDNs (CatalogItem.
 * imageSmallUrl/imageLargeUrl are plain URLs — this app has no R2/object
 * storage binding, see wrangler.jsonc), so a real indexer would need to
 * fetch each image before embedding it. Phase 1 does NOT generate
 * embeddings or fetch a single image — `rebuildIndex` is an explicit
 * no-op that reports how many cards WOULD be indexed once a
 * VisionEmbeddingProvider exists, per the brief's "do not generate
 * embeddings yet, do not introduce a vector database yet" instruction.
 */
import { db } from "@/lib/db";
import type { EmbeddingVector } from "./providers/types";

export interface CardReferenceRecord {
  /** Always an existing CatalogItem.id — never a new id scheme. */
  catalogItemId: string;
  gameId: string;
  /** CatalogItem.variantKey — which priced finish/printing this reference image is for. */
  variantKey: string;
  imageUrl: string;
  /** Null until a real VisionEmbeddingProvider has processed this card — see providers/null-embedding-provider.ts. */
  embedding: EmbeddingVector | null;
  /** Null until this record has actually been embedded/indexed. */
  indexedAt: string | null;
}

export interface IndexStatus {
  /** Count of CatalogItem rows with a non-null imageSmallUrl — the indexable pool. */
  indexableCount: number;
  /** Always 0 in Phase 1 — no embeddings have ever been generated. */
  indexedCount: number;
  lastRebuildAt: string | null;
}

export interface IndexRebuildResult {
  indexed: number;
  skipped: number;
  reason: string | null;
}

export interface CardReferenceIndexer {
  readonly id: string;
  /** Lists CatalogItem rows eligible to be indexed — optionally narrowed to one game or to rows synced since a given time, for incremental indexing of newly-added sets. */
  listIndexableCards(input?: { gameId?: string; since?: Date }): Promise<CardReferenceRecord[]>;
  getIndexStatus(): Promise<IndexStatus>;
  /** Rebuilds (or incrementally updates, when `gameId` is given) the reference index. A Phase-1 no-op — see file header. */
  rebuildIndex(input?: { gameId?: string }): Promise<IndexRebuildResult>;
}

async function queryIndexableCatalogItems(input: { gameId?: string; since?: Date } = {}) {
  return db.catalogItem.findMany({
    where: {
      imageSmallUrl: { not: null },
      ...(input.gameId ? { gameId: input.gameId } : {}),
      ...(input.since ? { lastSyncedAt: { gte: input.since } } : {}),
    },
    select: { id: true, gameId: true, variantKey: true, imageSmallUrl: true },
  });
}

/**
 * The one real (DB-reading) piece of this file: sources indexable cards
 * straight from CatalogItem via a narrow, non-mutating query — same
 * "filtered findMany, no new table" shape as
 * src/lib/catalog/images.ts's applyCatalogImagePatches. Embedding
 * generation and index persistence stay unimplemented (see rebuildIndex).
 */
export const catalogReferenceIndexer: CardReferenceIndexer = {
  id: "cardvision-catalog-reference-indexer",

  async listIndexableCards(input = {}): Promise<CardReferenceRecord[]> {
    const rows = await queryIndexableCatalogItems(input);
    return rows
      .filter((row): row is typeof row & { imageSmallUrl: string } => row.imageSmallUrl != null)
      .map((row) => ({
        catalogItemId: row.id,
        gameId: row.gameId,
        variantKey: row.variantKey,
        imageUrl: row.imageSmallUrl,
        embedding: null,
        indexedAt: null,
      }));
  },

  async getIndexStatus(): Promise<IndexStatus> {
    const indexableCount = await db.catalogItem.count({ where: { imageSmallUrl: { not: null } } });
    // No embeddings have ever been generated in Phase 1 — indexedCount and
    // lastRebuildAt are hardcoded rather than backed by a store, since no
    // store exists yet.
    return { indexableCount, indexedCount: 0, lastRebuildAt: null };
  },

  async rebuildIndex(input = {}): Promise<IndexRebuildResult> {
    const candidates = await this.listIndexableCards(input);
    return {
      indexed: 0,
      skipped: candidates.length,
      reason: "No VisionEmbeddingProvider configured yet — see providers/null-embedding-provider.ts and docs/cardvision.md's Phase 3.",
    };
  },
};
