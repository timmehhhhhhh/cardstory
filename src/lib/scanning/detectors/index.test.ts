import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDefaultCardDetector } from "./index";
import { singleRegionDetector } from "./single-region-detector";

describe("getDefaultCardDetector", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });

  it("returns the Claude detector's id when ANTHROPIC_API_KEY is set", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const detector = getDefaultCardDetector();
    expect(detector.id).toBe("claude-multi-region");
  });

  it("returns singleRegionDetector when ANTHROPIC_API_KEY is unset", () => {
    const detector = getDefaultCardDetector();
    expect(detector).toBe(singleRegionDetector);
  });
});
