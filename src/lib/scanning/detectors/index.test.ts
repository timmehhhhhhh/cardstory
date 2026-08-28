import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDefaultCardDetector } from "./index";
import { singleRegionDetector } from "./single-region-detector";

describe("getDefaultCardDetector", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it("returns the Gemini detector's id when GEMINI_API_KEY is set", () => {
    process.env.GEMINI_API_KEY = "test-key";
    const detector = getDefaultCardDetector();
    expect(detector.id).toBe("gemini-multi-region");
  });

  it("returns singleRegionDetector when GEMINI_API_KEY is unset", () => {
    const detector = getDefaultCardDetector();
    expect(detector).toBe(singleRegionDetector);
  });
});
