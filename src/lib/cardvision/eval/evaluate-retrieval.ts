/**
 * The measurable evaluation seam docs/cardvision.md's Phase 3 "evaluation
 * before optimization" requirement asks for: given a known reference
 * card's query image, does its embedding retrieve the correct catalog item
 * as the top candidate, or within the top-K? Deliberately simple — no
 * re-ranking, no ML — a fixed harness a future phase's real accuracy
 * numbers (and any future retriever/provider swap) can be measured against
 * apples-to-apples.
 *
 * This module never asserts a system "works" on its own — it only computes
 * numbers; whether those numbers are good enough is a judgment call left to
 * whoever reads the result (docs/cardvision.md explicitly warns against
 * claiming success just because embeddings can be generated).
 */
import type { CandidateRetriever, VisionEmbeddingProvider } from "../providers/types";
import type { ImageRef } from "../types";

/** One fixture: a query image known to depict `expectedCatalogItemId`. */
export interface RetrievalEvalCase {
  /** Free-form label for reporting a failure (e.g. "charizard-base-set-4"), not the catalog id. */
  label: string;
  expectedCatalogItemId: string;
  queryImage: ImageRef;
  gameHint?: string;
}

export interface RetrievalEvalFailure {
  label: string;
  expectedCatalogItemId: string;
  /** Where the expected item landed in the ranked results, 1-based — null if it wasn't retrieved at all within the requested K. */
  rank: number | null;
  topCandidateId: string | null;
  topSimilarity: number | null;
}

export interface RetrievalEvalResult {
  total: number;
  /** Cases skipped because the embedding provider returned null (not configured) for that query image — excluded from the accuracy denominators below, reported separately so a misconfigured run doesn't silently read as 0% accuracy. */
  skippedNotConfigured: number;
  top1Accuracy: number;
  top5Accuracy: number;
  top10Accuracy: number;
  /** Every retrieved top-candidate similarity score, for eyeballing the score distribution (docs/cardvision.md's "similarity score distribution" requirement) — deliberately raw, not binned/summarized, so a caller picks its own presentation. */
  similarityScores: number[];
  /** Every case where the expected item did not land at rank 1 — the top-10 cases are a superset filterable by `rank`. */
  failures: RetrievalEvalFailure[];
}

const K_VALUES = [1, 5, 10] as const;

function rankOf(candidateIds: string[], expectedId: string, withinTopK: number): number | null {
  const index = candidateIds.slice(0, withinTopK).indexOf(expectedId);
  return index === -1 ? null : index + 1;
}

/**
 * Runs one evaluation pass over `cases`. `k` bounds how many candidates are
 * requested from the retriever per case (defaults to 10, matching the
 * top-10 metric) — a retriever returning fewer than `k` candidates for a
 * given case is not itself a failure of this harness, just a smaller
 * result set to rank against.
 */
export async function evaluateRetrieval(
  cases: RetrievalEvalCase[],
  deps: { embeddingProvider: VisionEmbeddingProvider; retriever: CandidateRetriever; k?: number }
): Promise<RetrievalEvalResult> {
  const k = deps.k ?? 10;
  const failures: RetrievalEvalFailure[] = [];
  const similarityScores: number[] = [];
  let top1 = 0;
  let top5 = 0;
  let top10 = 0;
  let skippedNotConfigured = 0;

  for (const evalCase of cases) {
    const embedding = await deps.embeddingProvider.embed(evalCase.queryImage, "query");
    if (!embedding) {
      skippedNotConfigured += 1;
      continue;
    }

    const candidates = await deps.retriever.retrieve({ embedding, ocr: null, gameHint: evalCase.gameHint, limit: k });
    const candidateIds = candidates.map((c) => c.catalogItemId);

    if (candidateIds[0] != null) similarityScores.push(candidates[0].score);

    const rank1 = rankOf(candidateIds, evalCase.expectedCatalogItemId, 1);
    const rank5 = rankOf(candidateIds, evalCase.expectedCatalogItemId, 5);
    const rank10 = rankOf(candidateIds, evalCase.expectedCatalogItemId, 10);
    if (rank1 != null) top1 += 1;
    if (rank5 != null) top5 += 1;
    if (rank10 != null) top10 += 1;

    if (rank1 == null) {
      failures.push({
        label: evalCase.label,
        expectedCatalogItemId: evalCase.expectedCatalogItemId,
        rank: rank10,
        topCandidateId: candidateIds[0] ?? null,
        topSimilarity: candidates[0]?.score ?? null,
      });
    }
  }

  const evaluated = cases.length - skippedNotConfigured;
  return {
    total: cases.length,
    skippedNotConfigured,
    top1Accuracy: evaluated === 0 ? 0 : top1 / evaluated,
    top5Accuracy: evaluated === 0 ? 0 : top5 / evaluated,
    top10Accuracy: evaluated === 0 ? 0 : top10 / evaluated,
    similarityScores,
    failures,
  };
}

// Re-exported so a consumer importing only this module can see which K
// values the accuracy fields above correspond to without reading the source.
export const EVALUATED_K_VALUES = K_VALUES;
