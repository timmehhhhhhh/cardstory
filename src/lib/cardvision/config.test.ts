import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCardVisionProvider, getDefaultCardVisionRecognizer, isCardVisionDebug, isCardVisionEnabled } from "./config";

const ENV_KEYS = ["CARDVISION_ENABLED", "CARDVISION_PROVIDER", "CARDVISION_DEBUG", "VOYAGE_API_KEY"] as const;
const originalValues = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as Record<
  (typeof ENV_KEYS)[number],
  string | undefined
>;

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalValues[key] === undefined) delete process.env[key];
    else process.env[key] = originalValues[key];
  }
});

describe("isCardVisionEnabled", () => {
  it("is false when CARDVISION_ENABLED is unset", () => {
    expect(isCardVisionEnabled()).toBe(false);
  });

  it("is false for any value other than the exact string 'true'", () => {
    process.env.CARDVISION_ENABLED = "1";
    expect(isCardVisionEnabled()).toBe(false);
  });

  it("is true when CARDVISION_ENABLED is exactly 'true'", () => {
    process.env.CARDVISION_ENABLED = "true";
    expect(isCardVisionEnabled()).toBe(true);
  });
});

describe("getCardVisionProvider", () => {
  it("defaults to 'scaffold' when unset", () => {
    expect(getCardVisionProvider()).toBe("scaffold");
  });

  it("returns the configured value when set", () => {
    process.env.CARDVISION_PROVIDER = "embedding-v1";
    expect(getCardVisionProvider()).toBe("embedding-v1");
  });
});

describe("isCardVisionDebug", () => {
  it("is false when unset", () => {
    expect(isCardVisionDebug()).toBe(false);
  });

  it("is true when CARDVISION_DEBUG is exactly 'true'", () => {
    process.env.CARDVISION_DEBUG = "true";
    expect(isCardVisionDebug()).toBe(true);
  });
});

describe("getDefaultCardVisionRecognizer", () => {
  it("returns null when CardVision is disabled", () => {
    expect(getDefaultCardVisionRecognizer()).toBeNull();
  });

  it("returns a working recognizer when enabled, whose recognize() never throws even with only scaffold providers", async () => {
    process.env.CARDVISION_ENABLED = "true";

    const recognizer = getDefaultCardVisionRecognizer();
    expect(recognizer).not.toBeNull();

    const result = await recognizer!.recognize({
      image: { kind: "inline", base64: "abc", mimeType: "image/jpeg" },
      position: {
        imageId: "img-1",
        index: 0,
        row: null,
        column: null,
        page: null,
        boundingBox: { x: 0, y: 0, width: 1, height: 1, centerX: 0.5, centerY: 0.5, rotation: 0 },
      },
    });

    // No real OCR/embedding provider is configured, so the scaffold
    // catalog-text retriever finds nothing to search for.
    expect(result.status).toBe("unidentified");
    expect(result.error).toBeNull();
  });

  it("swaps in the real Voyage provider set when CARDVISION_PROVIDER=voyage-embedding, still gracefully unidentified without VOYAGE_API_KEY", async () => {
    process.env.CARDVISION_ENABLED = "true";
    process.env.CARDVISION_PROVIDER = "voyage-embedding";
    // VOYAGE_API_KEY intentionally left unset — no real network call should
    // happen; the Voyage provider's own "not configured" contract applies.

    const recognizer = getDefaultCardVisionRecognizer();
    expect(recognizer).not.toBeNull();
    expect(recognizer!.id).toBe("cardvision-voyage-embedding");

    const result = await recognizer!.recognize({
      image: { kind: "inline", base64: "abc", mimeType: "image/jpeg" },
      position: {
        imageId: "img-1",
        index: 0,
        row: null,
        column: null,
        page: null,
        boundingBox: { x: 0, y: 0, width: 1, height: 1, centerX: 0.5, centerY: 0.5, rotation: 0 },
      },
    });

    expect(result.status).toBe("unidentified");
    expect(result.error).toBeNull();
  });

  it("leaves default ('scaffold') behavior completely unaffected by the voyage-embedding branch existing", () => {
    process.env.CARDVISION_ENABLED = "true";
    const recognizer = getDefaultCardVisionRecognizer();
    expect(recognizer!.id).toBe("cardvision-scaffold");
  });
});
