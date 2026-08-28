import { describe, expect, it } from "vitest";
import { singleRegionDetector } from "./single-region-detector";

describe("singleRegionDetector", () => {
  it("returns exactly one DetectionRegion covering the full normalized image regardless of input dimensions", async () => {
    const regions = await singleRegionDetector.detect({
      image: { kind: "inline", base64: "abc", mimeType: "image/jpeg" },
      imagePixelWidth: 4032,
      imagePixelHeight: 3024,
    });
    expect(regions).toHaveLength(1);
    expect(regions[0].box).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    expect(regions[0].confidence).toBeGreaterThan(0);
    expect(regions[0].confidence).toBeLessThanOrEqual(1);
  });
});
