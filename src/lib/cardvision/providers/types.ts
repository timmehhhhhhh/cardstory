/**
 * The four independently-swappable provider seams CardVision's recognition
 * pipeline is decomposed into — see docs/cardvision.md for the full
 * pipeline diagram. Each is deliberately provider-agnostic: nothing here
 * names Claude/Gemini/OpenAI, an embedding model, an OCR engine, or a
 * vector database. Concrete Phase-1 scaffolds live alongside this file
 * (null-embedding-provider.ts, noop-ocr-provider.ts,
 * catalog-text-retriever.ts, deterministic-candidate-ranker.ts); a future
 * phase adds real implementations of the same interfaces without touching
 * ./recognizer.ts or any consumer.
 *
 * This mirrors src/lib/scanning/detectors/types.ts and
 * src/lib/scanning/identify/types.ts's pluggability convention: an `id`
 * field on every provider for logging/telemetry, and a single async method
 * per responsibility.
 */
import type { ImageRef, OcrReading, RecognitionCandidate } from "../types";

/** A vision embedding — deliberately generic (no fixed dimensionality) so different embedding models can coexist across phases. */
export interface EmbeddingVector {
  values: number[];
  dims: number;
  /** Identifies which embedding model produced this vector, e.g. "clip-vit-b32" — a future CandidateRetriever must not compare vectors from different models. */
  model: string;
}

/**
 * Which side of an (asymmetric) embedding model a call is for — most hosted
 * multimodal embedding APIs (e.g. Voyage) encode a "this is something to be
 * searched for" query differently from "this is something to be indexed"
 * document/reference content, and produce measurably worse similarity
 * scores if a caller doesn't distinguish them. Reference-image indexing
 * (embedding-index.ts) always passes "document"; recognition at query time
 * (recognizer.ts) always passes "query".
 */
export type EmbeddingRole = "document" | "query";

export interface VisionEmbeddingProvider {
  readonly id: string;
  /**
   * Returns null ONLY when this provider is not configured at all (e.g. no
   * API key set) — a deterministic, non-error "no embedding available"
   * state threaded through the rest of the pipeline. Any other failure
   * (network error, auth rejected, malformed image, rate limit exhausted,
   * a response whose dimensionality doesn't match its own data) throws an
   * `EmbeddingProviderError` (./embedding-error.ts) instead, so a caller
   * generating embeddings in bulk (embedding-index.ts) can record *why* one
   * item failed rather than treating every miss identically.
   *
   * `role` defaults to "query" (the recognizer.ts call site's use case) —
   * see EmbeddingRole above.
   */
  embed(image: ImageRef, role?: EmbeddingRole): Promise<EmbeddingVector | null>;
}

export interface OCRProvider {
  readonly id: string;
  read(image: ImageRef): Promise<OcrReading>;
}

/** What a CandidateRetriever has available to search with — a retriever is free to use only the signals it supports (embedding-only, text-only, or hybrid). */
export interface RetrievalQuery {
  embedding: EmbeddingVector | null;
  ocr: OcrReading | null;
  gameHint?: string;
  limit?: number;
}

export interface CandidateRetriever {
  readonly id: string;
  retrieve(query: RetrievalQuery): Promise<RecognitionCandidate[]>;
}

/** Additional context a CandidateRanker may use beyond each candidate's own signal scores — kept separate from RetrievalQuery since ranking happens after retrieval. */
export interface RankingEvidence {
  ocr: OcrReading | null;
  gameHint?: string;
}

export interface CandidateRanker {
  readonly id: string;
  /**
   * Pure and synchronous — ranking is a scoring/sort step over
   * already-retrieved candidates, not a network call. Returns a NEW
   * ranked array (highest score first); never mutates `candidates`.
   */
  rank(candidates: RecognitionCandidate[], evidence: RankingEvidence): RecognitionCandidate[];
}
