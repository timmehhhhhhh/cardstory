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

export interface VisionEmbeddingProvider {
  readonly id: string;
  /** Returns null when no embedding could be produced (no model configured, or the image failed to embed) — never throws for "not configured". */
  embed(image: ImageRef): Promise<EmbeddingVector | null>;
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
