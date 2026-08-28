/**
 * CardVision feature flags / configuration — env reads localized to this
 * one module, same convention as src/lib/scan/ai-provider.ts's `MODEL`
 * const and src/lib/pricing/ebay/client.ts's `isEbaySoldCompsEnabled()`
 * (a named boolean-returning function per flag, string `"true"`
 * comparison, no new config framework). See .env.example for the
 * documented env vars.
 */
import { embeddingSimilarityRetriever } from "./providers/embedding-similarity-retriever";
import { createVoyageEmbeddingProvider } from "./providers/voyage-embedding-provider";
import { createCardVisionRecognizer } from "./recognizer";
import type { CardVisionRecognizerConfig } from "./recognizer";
import type { CardVisionRecognizer } from "./recognizer";
import { consoleTelemetryRecorder, noopTelemetryRecorder } from "./telemetry";

/** CARDVISION_ENABLED — off (undefined/anything but "true") by default. The existing scanning engine (src/lib/scanning) is unaffected either way; this only gates whether CardVision itself is usable. */
export function isCardVisionEnabled(): boolean {
  return process.env.CARDVISION_ENABLED === "true";
}

/** CARDVISION_PROVIDER — identifies which CardVision provider set to run, defaulting to the Phase-1 scaffold. Future values (e.g. "embedding-v1") select a different CardVisionRecognizerConfig once real providers exist. */
export function getCardVisionProvider(): string {
  return process.env.CARDVISION_PROVIDER ?? "scaffold";
}

/** CARDVISION_DEBUG — when "true", recognition attempts are logged to the console via telemetry.ts's consoleTelemetryRecorder instead of discarded. */
export function isCardVisionDebug(): boolean {
  return process.env.CARDVISION_DEBUG === "true";
}

/**
 * The one place CardVision's enabled/disabled decision is made — mirrors
 * src/lib/scanning/detectors/index.ts's getDefaultCardDetector() "one
 * place the fallback decision is made" convention. Returns null when
 * disabled so a future caller's fallback-to-the-existing-pipeline logic is
 * a one-line check (`const recognizer = getDefaultCardVisionRecognizer();
 * if (!recognizer) { /* use claude-visual-text as today *\/ }`).
 */
export function getDefaultCardVisionRecognizer(): CardVisionRecognizer | null {
  if (!isCardVisionEnabled()) return null;

  const providerSet = getCardVisionProvider();
  const overrides: Partial<CardVisionRecognizerConfig> = {
    providerId: `cardvision-${providerSet}`,
    telemetry: isCardVisionDebug() ? consoleTelemetryRecorder : noopTelemetryRecorder,
  };

  // Phase 3's real, opt-in provider set (docs/cardvision.md) — everything
  // else (OCR, ranking) still comes from createCardVisionRecognizer's own
  // scaffold defaults. Requires VOYAGE_API_KEY; without one,
  // createVoyageEmbeddingProvider()'s embed() gracefully returns null per
  // its own contract, same as the scaffold's nullEmbeddingProvider.
  if (providerSet === "voyage-embedding") {
    overrides.embeddingProvider = createVoyageEmbeddingProvider();
    overrides.retriever = embeddingSimilarityRetriever;
  }

  return createCardVisionRecognizer(overrides);
}
