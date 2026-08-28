import { describe, expect, it } from "vitest";
import { boxOverlapRatio, normalizeBoundingBox, orderCardsReadingOrder } from "./geometry";
import type { BoundingBox } from "./types";

function box(x: number, y: number, width: number, height: number, rotation = 0): BoundingBox {
  return { x, y, width, height, centerX: x + width / 2, centerY: y + height / 2, rotation: rotation as 0 };
}

describe("normalizeBoundingBox", () => {
  it("clamps out-of-range coordinates into [0,1] and derives centerX/centerY", () => {
    const result = normalizeBoundingBox({ x: -0.2, y: 1.5, width: 0.5, height: 0.5 });
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeLessThanOrEqual(1);
    expect(result.centerX).toBe(result.x + result.width / 2);
    expect(result.centerY).toBe(result.y + result.height / 2);
  });

  it("converts pixel-space coordinates given image dimensions", () => {
    const result = normalizeBoundingBox({ x: 100, y: 200, width: 300, height: 400 }, 1000, 1000);
    expect(result.x).toBeCloseTo(0.1);
    expect(result.y).toBeCloseTo(0.2);
    expect(result.width).toBeCloseTo(0.3);
    expect(result.height).toBeCloseTo(0.4);
  });

  it("rounds a near-45deg rotation to the nearest quarter turn", () => {
    const result = normalizeBoundingBox({ x: 0, y: 0, width: 0.5, height: 0.5, rotation: 46 });
    expect(result.rotation).toBe(90);

    const roundedDown = normalizeBoundingBox({ x: 0, y: 0, width: 0.5, height: 0.5, rotation: 44 });
    expect(roundedDown.rotation).toBe(0);
  });

  it("defaults rotation to 0 when absent", () => {
    const result = normalizeBoundingBox({ x: 0, y: 0, width: 0.5, height: 0.5 });
    expect(result.rotation).toBe(0);
  });
});

describe("boxOverlapRatio", () => {
  it("returns 1 for identical boxes", () => {
    const a = box(0.1, 0.1, 0.2, 0.2);
    expect(boxOverlapRatio(a, a)).toBeCloseTo(1);
  });

  it("returns 0 for disjoint boxes", () => {
    const a = box(0, 0, 0.1, 0.1);
    const b = box(0.5, 0.5, 0.1, 0.1);
    expect(boxOverlapRatio(a, b)).toBe(0);
  });

  it("returns a partial ratio for overlapping boxes", () => {
    const a = box(0, 0, 0.2, 0.2);
    const b = box(0.1, 0.1, 0.2, 0.2);
    const ratio = boxOverlapRatio(a, b);
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(1);
  });
});

describe("orderCardsReadingOrder", () => {
  it("orders a 2x2 grid into row-major reading order regardless of input array order", () => {
    // Input deliberately out of order: bottom-right, top-left, bottom-left, top-right.
    const boxes = [box(0.6, 0.6, 0.3, 0.3), box(0.1, 0.1, 0.3, 0.3), box(0.1, 0.6, 0.3, 0.3), box(0.6, 0.1, 0.3, 0.3)];
    const order = orderCardsReadingOrder(boxes);
    // boxes[1] (top-left) should be first, boxes[3] (top-right) second,
    // boxes[2] (bottom-left) third, boxes[0] (bottom-right) fourth.
    expect(order[1]).toBe(0);
    expect(order[3]).toBe(1);
    expect(order[2]).toBe(2);
    expect(order[0]).toBe(3);
  });

  it("treats near-equal centerY values within rowTolerance as the same row despite jitter", () => {
    const boxes = [box(0.6, 0.12, 0.2, 0.2), box(0.1, 0.1, 0.2, 0.2)];
    const order = orderCardsReadingOrder(boxes, 0.08);
    // Same row (jitter within tolerance) -> ordered left-to-right by centerX.
    expect(order[1]).toBe(0);
    expect(order[0]).toBe(1);
  });

  it("returns a single-element result unchanged for one box", () => {
    const boxes = [box(0.2, 0.2, 0.3, 0.3)];
    expect(orderCardsReadingOrder(boxes)).toEqual([0]);
  });

  it("is deterministic for duplicate-position boxes via a stable original-index tie-break", () => {
    const boxes = [box(0.1, 0.1, 0.2, 0.2), box(0.1, 0.1, 0.2, 0.2)];
    expect(orderCardsReadingOrder(boxes)).toEqual([0, 1]);
  });
});
