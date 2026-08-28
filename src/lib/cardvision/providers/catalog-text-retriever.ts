/**
 * The one non-scaffold CandidateRetriever in Phase 1: a text-only
 * retriever that reuses the scanning engine's existing catalog-search-based
 * ranking (src/lib/scanning/identify/rank-candidates.ts) rather than
 * forking it — that module already does "catalog metadata -> set/number
 * relationships -> candidate ranking" over CatalogItem/CatalogSearchItem,
 * which is exactly the retrieval CardVision needs once an OCRProvider
 * supplies a card name/number/set reading. No visual-embedding signal is
 * involved here (see providers/types.ts's RetrievalQuery.embedding, which
 * this retriever ignores) — a future hybrid or embedding-only retriever is
 * a separate CandidateRetriever implementation, not a change to this one.
 */
import { rankCandidates } from "@/lib/scanning/identify/rank-candidates";
import type { RecognitionCandidate } from "../types";
import type { CandidateRetriever, RetrievalQuery } from "./types";

function toRecognitionCandidate(match: {
  catalogItemId: string;
  gameId: string;
  name: string;
  setName: string;
  number: string | null;
  imageSmallUrl: string | null;
  score: number;
}): RecognitionCandidate {
  return {
    catalogItemId: match.catalogItemId,
    gameId: match.gameId,
    name: match.name,
    setName: match.setName,
    number: match.number,
    imageSmallUrl: match.imageSmallUrl,
    visualSimilarity: null,
    // This retriever's only evidence is the OCR reading it was queried
    // with, so its match score IS the OCR-text signal — surfaced here
    // rather than left null, so a caller combining signals (see
    // deterministic-candidate-ranker.ts) has something to combine.
    ocrScore: match.score,
    metadataScore: null,
    score: match.score,
  };
}

export const catalogTextRetriever: CandidateRetriever = {
  id: "cardvision-catalog-text",
  async retrieve(query: RetrievalQuery): Promise<RecognitionCandidate[]> {
    const cardName = query.ocr?.name?.trim();
    if (!cardName) return [];

    const matches = await rankCandidates({
      cardName,
      cardNumber: query.ocr?.collectorNumber ?? null,
      setNameOrSymbol: query.ocr?.setNameOrSymbol ?? null,
      gameId: query.gameHint ?? null,
      limit: query.limit,
    });

    return matches.map(toRecognitionCandidate);
  },
};
