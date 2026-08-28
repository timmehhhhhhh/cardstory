/**
 * Shared domain model for CardVision — the specialised vision-retrieval
 * recognition architecture described in docs/cardvision.md. This file is
 * intentionally logic-free (no provider/Prisma imports), mirroring
 * src/lib/scanning/types.ts's convention, so a consumer can
 * `import type { ... } from "@/lib/cardvision"` without pulling in any
 * runtime provider dependencies.
 *
 * CardVision is a PARALLEL, currently-unused recognition path — it does not
 * replace src/lib/scanning's `claude-visual-text` IdentificationStrategy,
 * which stays the default for the Mass Card Scanner and Binder Import (see
 * ./identification-strategy-adapter.ts for how CardVision could eventually
 * become another IdentificationStrategy without changing either feature).
 *
 * Where a concept already exists in the scanning engine (bounding boxes,
 * image references, source-image ids), this module reuses that type
 * directly rather than redefining an equivalent one — see the re-exports
 * below.
 */
import type { BoundingBox, Confidence, ImageRef, SourceImageId } from "@/lib/scanning";

export type { BoundingBox, Confidence, ImageRef, SourceImageId };

/**
 * Coarse recognition outcome for one card. Distinct from
 * `RecognitionConfidenceLevel` below: `status` is "what happened",
 * `confidenceLevel` is "how much to trust it" — the same status can in
 * principle occur at more than one confidence level (e.g. "recognized" at
 * NEEDS_REVIEW when exactly one candidate cleared the floor but wasn't a
 * clear standout).
 */
export type RecognitionStatus = "pending" | "recognized" | "needs_review" | "unidentified" | "error";

/**
 * The exact confidence states requirement #7 of the CardVision brief names,
 * kept distinct from src/lib/scanning's `ConfidenceLevel` (HIGH/MEDIUM/LOW/
 * UNIDENTIFIED) rather than reusing it — CardVision's eventual multi-signal
 * ranking (visual similarity + OCR + metadata) is a different scoring
 * regime than the existing engine's detection/identification-confidence
 * pair, so collapsing them onto the same four-value enum would blur which
 * system produced a given classification. See ./confidence.ts for the
 * (currently deterministic/scaffold) classification logic and the intended
 * business behavior each level implies:
 *
 * - HIGH_CONFIDENCE  -> can potentially auto-import
 * - NEEDS_REVIEW      -> present candidate(s) for confirmation
 * - LOW_CONFIDENCE    -> require user identification
 * - UNIDENTIFIED      -> no trustworthy candidate at all
 * - ERROR             -> recognition itself failed (not a confidence judgment)
 */
export type RecognitionConfidenceLevel = "HIGH_CONFIDENCE" | "NEEDS_REVIEW" | "LOW_CONFIDENCE" | "UNIDENTIFIED" | "ERROR";

/**
 * One catalog candidate CardVision proposes for a card, extending the
 * scanning engine's `CandidateMatch` shape (catalogItemId/gameId/name/
 * setName/number/imageSmallUrl/score) with the per-signal breakdown the
 * CardVision brief asks for. Every signal is nullable because Phase 1 has
 * no real embedding/OCR provider yet (see providers/*) — a null signal
 * means "this signal wasn't available for this candidate", never "this
 * signal scored zero".
 */
export interface RecognitionCandidate {
  catalogItemId: string;
  gameId: string;
  name: string;
  setName: string;
  number: string | null;
  imageSmallUrl: string | null;
  /** 0..1, null until a real VisionEmbeddingProvider is wired in — see providers/null-embedding-provider.ts. */
  visualSimilarity: number | null;
  /** 0..1, null until a real OCRProvider is wired in — see providers/noop-ocr-provider.ts. */
  ocrScore: number | null;
  /** 0..1 — how well name/number/set metadata matches, independent of visual or OCR evidence. */
  metadataScore: number | null;
  /** Overall ranking score, 0..1 where 1 = best match — see providers/deterministic-candidate-ranker.ts for how this is combined from the signals above. */
  score: Confidence;
}

/** Structured text CardVision read directly off a card crop — the OCR / collector-number extraction stage's output. */
export interface OcrReading {
  name: string | null;
  collectorNumber: string | null;
  setNameOrSymbol: string | null;
  /** Everything OCR could read, unparsed — kept for future debugging/telemetry even after name/collectorNumber extraction. */
  rawText: string | null;
}

/**
 * Preserves a detected card's spatial position within its source image —
 * required for the future Binder Planner import workflow to map a
 * recognized card back to an exact virtual binder pocket. Mirrors
 * src/lib/scanning/types.ts's `DetectedPosition`/`BoundingBox` fields
 * directly (reused, not redefined) and adds the row/column/page grid
 * coordinates the CardVision brief's `CardDetection` example asks for.
 *
 * `row`/`column`/`page` are nullable: CardVision itself never computes a
 * grid mapping (Binder Import already owns that via
 * src/lib/scanning/geometry.ts's `mapCardsToGrid`) — this type exists so a
 * caller that HAS computed row/column/page (e.g. Binder Import, after
 * mapping) can attach it to a recognition request/result and have it
 * survive the round trip, not so CardVision derives it itself.
 */
export interface CardPosition {
  imageId: SourceImageId;
  /** 0-based index in reading order among the cards recognized from the same image — same convention as DetectedPosition.index. */
  index: number;
  row: number | null;
  column: number | null;
  /** Physical binder page number, when known — see ImportPageResult.physicalPageNumber in src/lib/binder-import/types.ts. */
  page: number | null;
  boundingBox: BoundingBox;
}

/** Recognition-attempt-scoped processing metadata — kept separate from RecognitionResult's own fields so it's easy to extend without touching the result's core shape. */
export interface RecognitionMetadata {
  /** Id of the CardVisionRecognizer (or its underlying provider set) that produced this result — e.g. "cardvision-scaffold". */
  provider: string;
  /** Wall-clock time the recognize() call took, when measured. */
  processingTimeMs: number | null;
}

/**
 * Top-level result of recognizing ONE card. Deliberately never assumes the
 * first candidate is correct: `cardId` is only set once a caller (human or
 * a future auto-import policy) confirms one, mirroring
 * src/lib/scanning/types.ts's DetectedCard.selectedCandidateId convention.
 * `candidates` is ranked, highest score first, and is the thing a review UI
 * actually presents.
 */
export interface RecognitionResult {
  recognitionId: string;
  status: RecognitionStatus;
  confidenceLevel: RecognitionConfidenceLevel;
  /** CardStory CatalogItem.id ("<gameId>:<externalId>") once confirmed — null until then. Never a new id scheme. */
  cardId: string | null;
  /** Overall confidence in `cardId` (or, while unconfirmed, in candidates[0]), 0..1. */
  confidence: Confidence;
  /** Ranked, highest score first. Empty when status is "unidentified" or "error". */
  candidates: RecognitionCandidate[];
  /** Null when no OCR provider ran (e.g. an error before that stage) or none is configured. */
  ocr: OcrReading | null;
  position: CardPosition;
  metadata: RecognitionMetadata;
  /** Non-null only when status is "error" — a human-readable cause, never a raw provider stack trace. */
  error: string | null;
}

/**
 * Wraps zero-or-more RecognitionResults from ONE source photo — the
 * binder-page / multi-card shape the CardVision brief's "single-card
 * photographs, multiple cards in one photograph, binder-page photographs"
 * requirement calls for. Shaped like src/lib/scanning/types.ts's
 * `ScanResult` deliberately, so a future consumer familiar with that type
 * finds this one unsurprising.
 */
export interface MultiCardRecognitionResult {
  sourceImageId: SourceImageId;
  createdAt: string;
  results: RecognitionResult[];
  /** Non-null only when the whole recognition run failed before producing any results. */
  error: string | null;
}
