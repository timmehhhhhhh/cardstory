/**
 * The first real (non-text) CandidateRetriever: brute-force cosine
 * similarity over persisted CardReferenceEmbedding rows. Intentionally the
 * simplest correct retrieval CardVision's brief asks for — no pgvector, no
 * approximate nearest-neighbour index, no re-ranking — just "embed the
 * query, compare it to every ready reference embedding sharing the same
 * provider, return the top matches" (docs/cardvision.md's Phase 3
 * "measurable, not sophisticated" instruction).
 *
 * Deliberately embedding-only, same shape as catalog-text-retriever.ts
 * being OCR-only: a future hybrid retriever combining both signals is a
 * separate CandidateRetriever implementation, not a change to either of
 * these.
 */
import { db } from "@/lib/db";
import { getCatalogItemsByIds } from "@/lib/catalog/by-ids";
import type { RecognitionCandidate } from "../types";
import { cosineSimilarity, decodeEmbeddingValues } from "./embedding-codec";
import type { CandidateRetriever, RetrievalQuery } from "./types";

const DEFAULT_LIMIT = 10;

export const embeddingSimilarityRetriever: CandidateRetriever = {
  id: "cardvision-embedding-similarity",

  async retrieve(query: RetrievalQuery): Promise<RecognitionCandidate[]> {
    const embedding = query.embedding;
    if (!embedding) return [];

    const rows = await db.cardReferenceEmbedding.findMany({
      where: {
        provider: embedding.model,
        status: "ready",
        ...(query.gameHint ? { gameId: query.gameHint } : {}),
      },
      select: { catalogItemId: true, variantKey: true, dims: true, vector: true },
    });
    if (rows.length === 0) return [];

    const catalogItemIds = [...new Set(rows.map((r) => r.catalogItemId))];
    // Reused, not re-queried — same seam catalog-text-retriever.ts's sibling
    // rank-candidates.ts and other CatalogItem consumers use for the
    // id/name/setName/number/imageSmallUrl shape (setName specifically
    // requires the Set join getCatalogItemsByIds already does).
    const catalogItems = await getCatalogItemsByIds(catalogItemIds);
    const catalogById = new Map(catalogItems.map((c) => [c.id, c]));

    const scored: { catalogItemId: string; similarity: number }[] = [];
    for (const row of rows) {
      // A dims mismatch means this row's vector can't be meaningfully
      // compared to the query — skip it rather than throw, so one corrupt
      // row can't fail an entire retrieval (mirrors reference-index.ts's
      // "a single item's problem never aborts the run" convention).
      if (row.dims !== embedding.dims) continue;
      let values: number[];
      try {
        values = decodeEmbeddingValues(row.vector, row.dims);
      } catch {
        continue;
      }
      scored.push({ catalogItemId: row.catalogItemId, similarity: cosineSimilarity(embedding.values, values) });
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    const limit = query.limit ?? DEFAULT_LIMIT;

    const candidates: RecognitionCandidate[] = [];
    for (const { catalogItemId, similarity } of scored) {
      const item = catalogById.get(catalogItemId);
      if (!item) continue; // Catalog item removed since the embedding was generated — skip rather than surface a dangling reference.
      candidates.push({
        catalogItemId: item.id,
        gameId: item.gameId,
        name: item.name,
        setName: item.setName,
        number: item.number,
        imageSmallUrl: item.imageSmallUrl,
        visualSimilarity: similarity,
        ocrScore: null,
        metadataScore: null,
        score: similarity,
      });
      if (candidates.length >= limit) break;
    }

    return candidates;
  },
};
