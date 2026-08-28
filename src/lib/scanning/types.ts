/**
 * Shared domain model for the card-scanning engine — the shape both the
 * (not-yet-built) Mass Card Scanner and Binder Import features consume.
 *
 * This file is intentionally logic-free: no Gemini/Prisma/catalog imports,
 * so a consumer can `import type { ... } from "@/lib/scanning"` without
 * pulling in the pipeline's runtime dependencies. See ./pipeline.ts for the
 * function that produces these values and ./corrections.ts for the pure
 * functions that derive a new ScanResult from reviewer input.
 *
 * The engine never touches PC (src/lib/pc) or Binder (src/lib/binder) data —
 * it only ever returns this structure for a caller to act on.
 */

/** 0..1 inclusive confidence score. Not runtime-branded (a plain number) since it crosses zod/JSON boundaries freely once a future API route wraps the pipeline. */
export type Confidence = number;

/**
 * Axis-aligned bounding box for one detected card, normalized to [0,1]
 * relative to the source image's pixel width/height so it survives any
 * later resize/recompression of the source image (the existing
 * capture-upload.tsx resize-before-send convention already assumes callers
 * don't keep the original pixel dimensions around).
 *
 * `rotation` is degrees clockwise the card appears rotated within the box —
 * normalized to the nearest quarter turn (0/90/180/270), see geometry.ts.
 * `centerX`/`centerY` are derived from x/y/width/height, not independently
 * authoritative — always recompute them together via geometry.ts rather
 * than patching one field.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  rotation: number;
}

/**
 * A detected card's position within one ScanResult, in deterministic
 * reading order (left-to-right, top-to-bottom by row — see
 * geometry.ts's orderCardsReadingOrder). This is NOT a BinderPage
 * slotIndex — Binder Import maps `index` + `boundingBox` into a
 * `PocketRef` itself, later; the engine never computes one.
 */
export interface DetectedPosition {
  /** 0-based index in reading order among the cards in the same ScanResult. */
  index: number;
}

/**
 * A reference to image bytes without the engine owning storage for them —
 * there is no image-upload/persistence infrastructure in this app (no R2
 * binding, no CDN re-hosting of user photos). `kind: "inline"` carries the
 * bytes themselves (base64), mirroring the existing `/api/scan/identify`
 * request-body pattern ("nothing is stored beyond this request").
 * `kind: "external"` carries a URL a caller already controls (e.g. a
 * client-side object URL) — the engine never fetches or persists either
 * beyond what a given CardDetector/ImageProcessor call needs to do its job.
 */
export type ImageRef =
  | { kind: "inline"; base64: string; mimeType: string }
  | { kind: "external"; url: string; mimeType: string };

/**
 * Ephemeral identifier for one source photo within a single pipeline run —
 * NOT a persisted row id (no backing store exists for this in this phase).
 * Stable only for the lifetime of one runScanPipeline call / one in-memory
 * ScanResult, so a future UI can correlate multiple DetectedCards back to
 * "the same photo" without the engine needing a database.
 */
export type SourceImageId = string;

export type IdentificationStatus =
  | "pending"
  | "identified"
  | "ambiguous"
  | "unidentified"
  | "error";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNIDENTIFIED";

/**
 * One catalog candidate the identification strategy proposes for a
 * detected card. Uses the existing catalog identity verbatim — never a new
 * id scheme — see `CatalogSearchItem.id` in src/lib/catalog/search.ts
 * ("<gameId>:<externalId>" for TCG rows, a plain cuid for sports rows).
 */
export interface CandidateMatch {
  catalogItemId: string;
  gameId: string;
  name: string;
  setName: string;
  number: string | null;
  imageSmallUrl: string | null;
  /** Ranking score, 0..1 where 1 = best match — see identify/rank-candidates.ts. */
  score: Confidence;
}

/** One physical card detected within a source image. */
export interface DetectedCard {
  /** Stable within one ScanResult; used by corrections.ts to address a specific card. */
  cardId: string;
  sourceImageId: SourceImageId;
  boundingBox: BoundingBox;
  detectedPosition: DetectedPosition;
  /** Set once an ImageProcessor has produced a per-card crop; null until then. */
  croppedImage: ImageRef | null;
  /**
   * Degrees clockwise applied (or still to apply) to present the card
   * upright — distinct from `boundingBox.rotation`, which is the box's
   * rotation in source-image space; this is the crop's own display
   * orientation.
   */
  orientation: 0 | 90 | 180 | 270;
  detectionConfidence: Confidence;
  identificationStatus: IdentificationStatus;
  identificationConfidence: Confidence;
  /** Ranked, highest score first. Empty when identificationStatus is "unidentified" or "error". */
  candidates: CandidateMatch[];
  /**
   * Caller/reviewer's chosen catalogItemId — null until a human or a
   * confident auto-pick sets it. Distinct from `candidates[0]`: a
   * HIGH-confidence pipeline run MAY auto-populate this from
   * `candidates[0]` (see pipeline.ts), but nothing else in the engine
   * assumes `selectedCandidateId` tracks `candidates[0]`.
   */
  selectedCandidateId: string | null;
  confidenceLevel: ConfidenceLevel;
  /**
   * True when this card still needs a human look before a feature acts on
   * it — see confidence.ts's computeNeedsReview. Precomputed onto the
   * object (not left for every consumer to recompute) since it's the one
   * field a review UI list-view needs to filter/sort on immediately.
   */
  needsReview: boolean;
  /** Non-null only when identificationStatus is "error" — a human-readable cause, never a raw stack trace. */
  error: string | null;
  /**
   * Set by a reviewer skipping this detected region without picking a
   * candidate (e.g. "that's a sleeve corner, not a card") — distinct from
   * an error: a deliberate human decision, not a failure. Consumers should
   * exclude skipped cards from "cards still needing review" counts.
   */
  skipped: boolean;
}

/** Top-level result of one runScanPipeline call over one source image. */
export interface ScanResult {
  scanResultId: string;
  sourceImageId: SourceImageId;
  createdAt: string;
  cards: DetectedCard[];
  /**
   * Non-null only when the whole pipeline run failed before producing any
   * cards (e.g. the detector's provider was entirely unreachable) —
   * distinct from a single DetectedCard's per-card `error`.
   */
  error: string | null;
}
