/**
 * Recognition telemetry — the seam for eventually building a real-world
 * training dataset from CardStory usage (see docs/cardvision.md's Phase 7:
 * REAL CARD PHOTOS -> CARDVISION PREDICTION -> USER CORRECTION -> VERIFIED
 * TRAINING EXAMPLE -> FUTURE MODEL IMPROVEMENT).
 *
 * Deliberately NO Prisma model is added in this phase — see
 * docs/cardvision.md's "Future CardVision Implementation" section. This
 * repo's own convention (ActivityLog / src/lib/activity/log.ts) only adds
 * a table once a real writer needs it; a `CardVisionRecognitionLog` model
 * is explicit future work (Phase 7), not scaffolded ahead of time.
 * `RecognitionAttempt` is the contract that model would persist.
 *
 * Never records raw image bytes — only ImageRef metadata (kind/mimeType) —
 * per the CardVision brief's "respect the app's existing privacy/data-
 * retention architecture and do not introduce unnecessary storage of user
 * images" instruction. This app has no existing image-upload/persistence
 * infrastructure at all (see src/lib/scanning/types.ts's ImageRef doc
 * comment), so telemetry doesn't introduce the first one.
 */
import type { OcrReading, RecognitionStatus } from "./types";

/** Non-image metadata about the photo a recognition attempt ran against — never the image bytes themselves. */
export interface TelemetryImageRef {
  kind: "inline" | "external";
  mimeType: string;
}

export interface RecognitionAttempt {
  recognitionId: string;
  image: TelemetryImageRef;
  /** Which CardVisionRecognizer/provider set produced this attempt — see recognizer.ts's CardVisionRecognizerConfig.providerId. */
  provider: string;
  status: RecognitionStatus;
  /** CardVision's own predicted CatalogItem.id, if any. */
  cardId: string | null;
  /** Every candidate CatalogItem.id offered, ranked order. */
  candidateIds: string[];
  confidence: number;
  ocr: OcrReading | null;
  processingTimeMs: number | null;
  /**
   * Filled in later by a future confirmation flow (a reviewer picking a
   * different candidate, or confirming CardVision's own pick) — null until
   * then. This is the field that turns a raw prediction into a verified
   * training example per the Phase 7 training loop.
   */
  userCorrectedCardId: string | null;
  /** Null until userCorrectedCardId (or an explicit confirmation) is known; true/false once it is. */
  wasCorrect: boolean | null;
  createdAt: string;
}

export interface RecognitionTelemetryRecorder {
  readonly id: string;
  /** Never throws — a telemetry failure must never fail the recognition it's recording (same convention as src/lib/activity/log.ts's logActivity). */
  record(entry: RecognitionAttempt): Promise<void>;
}

/** Default recorder: discards every attempt. Used whenever CARDVISION_DEBUG is off — see config.ts. */
export const noopTelemetryRecorder: RecognitionTelemetryRecorder = {
  id: "cardvision-noop-telemetry",
  async record(): Promise<void> {
    // Intentionally does nothing.
  },
};

/** Dev-only recorder: logs each attempt to the console rather than persisting it anywhere — gated by CARDVISION_DEBUG (see config.ts's isCardVisionDebug). */
export const consoleTelemetryRecorder: RecognitionTelemetryRecorder = {
  id: "cardvision-console-telemetry",
  async record(entry: RecognitionAttempt): Promise<void> {
    console.debug("[cardvision] recognition attempt", entry);
  },
};
