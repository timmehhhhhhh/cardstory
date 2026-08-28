/**
 * The scanning engine's orchestrator: image -> detect -> crop/normalize ->
 * identify -> rank -> confidence -> a structured, reviewable ScanResult.
 *
 * This function never touches PC (src/lib/pc) or Binder (src/lib/binder)
 * state, and never decides how a feature presents or acts on its output —
 * it only identifies cards. See ./corrections.ts for the pure functions a
 * future UI uses to mutate the result it gets back from here.
 */
import { classifyConfidence, computeNeedsReview } from "./confidence";
import { normalizeBoundingBox, orderCardsReadingOrder } from "./geometry";
import { getDefaultCardDetector } from "./detectors";
import type { CardDetector } from "./detectors/types";
import { serverImageProcessor } from "./image-processing/server-image-processor";
import type { ImageProcessor } from "./image-processing/types";
import { getDefaultIdentificationStrategy } from "./identify";
import type { IdentificationOutput, IdentificationStrategy } from "./identify/types";
import type { BoundingBox, DetectedCard, ImageRef, ScanResult } from "./types";

export interface RunScanPipelineInput {
  image: ImageRef;
  imagePixelWidth?: number;
  imagePixelHeight?: number;
  detector?: CardDetector;
  imageProcessor?: ImageProcessor;
  identificationStrategy?: IdentificationStrategy;
  /** Passed through to the identification strategy as a game-search hint — see IdentificationInput.gameHint. */
  gameHint?: string;
  /**
   * Caps how many detected regions get identified (identification calls
   * are per-card and rate/cost-bearing) — callers doing a mass scan of a
   * busy photo should set this deliberately rather than the engine
   * guessing a default.
   */
  maxCards?: number;
}

const DEFAULT_MAX_CARDS = 20;

function computeTopCandidateSeparation(candidates: { score: number }[]): number {
  if (candidates.length === 0) return 0;
  if (candidates.length === 1) return candidates[0].score;
  return candidates[0].score - candidates[1].score;
}

async function buildDetectedCard(
  sourceImageId: string,
  box: BoundingBox,
  positionIndex: number,
  detectionConfidence: number,
  image: ImageRef,
  imageProcessor: ImageProcessor,
  identificationStrategy: IdentificationStrategy,
  imagePixelWidth: number | undefined,
  imagePixelHeight: number | undefined,
  gameHint: string | undefined
): Promise<DetectedCard> {
  const cardId = crypto.randomUUID();

  let croppedImage: ImageRef | null = null;
  try {
    const cropped = await imageProcessor.crop(image, box, imagePixelWidth, imagePixelHeight);
    croppedImage = await imageProcessor.correctPerspective(cropped, box);
  } catch (err) {
    // A crop failure still yields a reviewable (if unidentified) card
    // rather than dropping the detected region entirely.
    return {
      cardId,
      sourceImageId,
      boundingBox: box,
      detectedPosition: { index: positionIndex },
      croppedImage: null,
      orientation: 0,
      detectionConfidence,
      identificationStatus: "error",
      identificationConfidence: 0,
      candidates: [],
      selectedCandidateId: null,
      confidenceLevel: "UNIDENTIFIED",
      needsReview: true,
      error: err instanceof Error ? err.message : "Image cropping failed",
      skipped: false,
    };
  }

  let output: IdentificationOutput;
  try {
    output = await identificationStrategy.identify({ croppedImage, gameHint });
  } catch (err) {
    output = {
      status: "error",
      identificationConfidence: 0,
      candidates: [],
      error: err instanceof Error ? err.message : "Identification failed",
    };
  }

  const topCandidateSeparation = computeTopCandidateSeparation(output.candidates);
  const confidenceLevel = classifyConfidence({
    detectionConfidence,
    identificationConfidence: output.identificationConfidence,
    topCandidateSeparation,
    candidateCount: output.candidates.length,
  });
  const needsReview = computeNeedsReview(confidenceLevel, output.status);

  return {
    cardId,
    sourceImageId,
    boundingBox: box,
    detectedPosition: { index: positionIndex },
    croppedImage,
    orientation: 0,
    detectionConfidence,
    identificationStatus: output.status,
    identificationConfidence: output.identificationConfidence,
    candidates: output.candidates,
    // A human still confirms even a HIGH-confidence pick before it's acted
    // on by a feature — auto-selecting here would blur "the engine's best
    // guess" with "what a reviewer chose" (see types.ts's DetectedCard
    // comment). Consumers read candidates[0] for the engine's top pick.
    selectedCandidateId: null,
    confidenceLevel,
    needsReview,
    error: output.error,
    skipped: false,
  };
}

/**
 * detect -> normalize+order boxes -> crop each region -> identify each crop
 * (bounded by maxCards) -> classify confidence -> assemble DetectedCard[]
 * -> assemble ScanResult.
 *
 * Never throws for a per-card failure — recorded as that card's
 * `identificationStatus: "error"` + `error` string. Only throws on a
 * whole-run failure (e.g. `detector.detect()` itself rejects); callers
 * should either catch that themselves or use `runScanPipelineSafe` below.
 */
export async function runScanPipeline(input: RunScanPipelineInput): Promise<ScanResult> {
  const {
    image,
    imagePixelWidth,
    imagePixelHeight,
    detector = getDefaultCardDetector(),
    imageProcessor = serverImageProcessor,
    identificationStrategy = getDefaultIdentificationStrategy(),
    gameHint,
    maxCards = DEFAULT_MAX_CARDS,
  } = input;

  const sourceImageId = crypto.randomUUID();

  const regions = await detector.detect({ image, imagePixelWidth, imagePixelHeight });
  const boundedRegions = regions.slice(0, maxCards);

  const boxes = boundedRegions.map((region) =>
    normalizeBoundingBox(region.box, imagePixelWidth, imagePixelHeight)
  );
  const positionIndices = orderCardsReadingOrder(boxes);

  const cards = await Promise.all(
    boundedRegions.map((region, i) =>
      buildDetectedCard(
        sourceImageId,
        boxes[i],
        positionIndices[i],
        region.confidence,
        image,
        imageProcessor,
        identificationStrategy,
        imagePixelWidth,
        imagePixelHeight,
        gameHint
      )
    )
  );

  // Present cards in reading order rather than detector-return order.
  cards.sort((a, b) => a.detectedPosition.index - b.detectedPosition.index);

  return {
    scanResultId: crypto.randomUUID(),
    sourceImageId,
    createdAt: new Date().toISOString(),
    cards,
    error: null,
  };
}

/**
 * Never-throws wrapper: catches anything `runScanPipeline` throws and
 * returns a well-formed `ScanResult` (empty `cards`, populated top-level
 * `error`) so a caller never needs its own try/catch to get a usable
 * result back.
 */
export async function runScanPipelineSafe(input: RunScanPipelineInput): Promise<ScanResult> {
  try {
    return await runScanPipeline(input);
  } catch (err) {
    return {
      scanResultId: crypto.randomUUID(),
      sourceImageId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      cards: [],
      error: err instanceof Error ? err.message : "Scan pipeline failed",
    };
  }
}
