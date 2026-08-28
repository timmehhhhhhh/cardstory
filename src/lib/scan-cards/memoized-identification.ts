import type { IdentificationInput, IdentificationOutput, IdentificationStrategy } from "@/lib/scanning/identify/types";

/**
 * Decorates any IdentificationStrategy with an in-memory, per-instance
 * cache keyed by the crop's own content — NOT part of the shared scanning
 * engine (src/lib/scanning/**), which this feature (Mass Card Scanner) must
 * not fork. This is purely a Mass Card Scanner-owned wrapper built on the
 * engine's existing pluggability seam (RunScanPipelineInput.identificationStrategy).
 *
 * Why this exists: src/lib/scanning/image-processing/server-image-processor.ts's
 * `crop`/`correctPerspective` are documented pass-through stubs — every
 * DetectedCard.croppedImage produced from one source photo is today
 * byte-identical to the whole original photo. Without this cache, a photo
 * with N detected cards would fire N duplicate Gemini-vision calls and N
 * duplicate catalog searches for what is, today, literally the same input
 * image — exactly the "don't hammer the catalog with duplicate searches"
 * failure mode. A future real per-card ImageProcessor would naturally
 * produce distinct crops per card, at which point this cache simply stops
 * finding hits (never stops being correct) rather than needing to change.
 *
 * Scope: construct one instance per pipeline run (e.g. once per
 * /api/scan/mass request) — the cache is intentionally unbounded within
 * that scope (a single photo's card count is already capped by
 * RunScanPipelineInput.maxCards) and must not be reused across requests
 * from different photos/users, since a wrong game/candidate cached from an
 * unrelated card would silently leak into this one.
 */
export function createMemoizedIdentificationStrategy(
  inner: IdentificationStrategy
): IdentificationStrategy {
  const cache = new Map<string, Promise<IdentificationOutput>>();

  function cacheKey(input: IdentificationInput): string | null {
    const image = input.croppedImage;
    if (!image) return null;
    const imageKey = image.kind === "inline" ? `inline:${image.mimeType}:${image.base64}` : `external:${image.url}`;
    // boundingBox must be part of the key: since croppedImage is
    // byte-identical for every card in one photo (see this file's header
    // comment), the boundingBox is the only thing distinguishing "the same
    // card requested twice" from "two different cards sharing one photo" —
    // rounded so float jitter can't create spurious cache misses.
    const box = input.boundingBox;
    const boxKey = box ? `${box.x.toFixed(4)},${box.y.toFixed(4)},${box.width.toFixed(4)},${box.height.toFixed(4)}` : "";
    return `${imageKey}::${input.gameHint ?? ""}::${boxKey}`;
  }

  return {
    id: `memoized(${inner.id})`,
    async identify(input: IdentificationInput): Promise<IdentificationOutput> {
      const key = cacheKey(input);
      // No croppedImage at all (a crop failure upstream) — nothing to key
      // a cache entry on, and the inner strategy already handles this input
      // shape itself; just pass it straight through uncached.
      if (key === null) return inner.identify(input);

      const cached = cache.get(key);
      if (cached) return cached;

      const promise = inner.identify(input);
      cache.set(key, promise);
      // A rejected identify() shouldn't poison the cache for a retry of the
      // exact same crop — drop the failed entry so the next lookup (e.g. a
      // per-card "Retry" action, or another region sharing this crop) gets a
      // fresh attempt instead of replaying the same failure forever.
      promise.catch(() => cache.delete(key));
      return promise;
    },
  };
}
