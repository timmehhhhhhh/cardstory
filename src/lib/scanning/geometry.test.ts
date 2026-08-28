import { describe, expect, it } from "vitest";
import { boxOverlapRatio, mapCardsToGrid, normalizeBoundingBox, orderCardsReadingOrder } from "./geometry";
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

/** Small helper: a box whose center sits at exactly (centerX, centerY). */
function boxAt(centerX: number, centerY: number): BoundingBox {
  return { x: centerX, y: centerY, width: 0, height: 0, centerX, centerY, rotation: 0 };
}

describe("mapCardsToGrid", () => {
  it("maps a full 3x3 page (one box per cell) to all nine pockets with no conflicts or gaps", () => {
    const boxes = [
      boxAt(0.15, 0.15), boxAt(0.5, 0.15), boxAt(0.85, 0.15),
      boxAt(0.15, 0.5), boxAt(0.5, 0.5), boxAt(0.85, 0.5),
      boxAt(0.15, 0.85), boxAt(0.5, 0.85), boxAt(0.85, 0.85),
    ];
    const result = mapCardsToGrid(boxes, 3, 3);
    expect(result.cells.map((c) => c.pocketIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.conflicts).toEqual([]);
    expect(result.unmappedPockets).toEqual([]);
  });

  it("reports every pocket unmapped for an empty page", () => {
    const result = mapCardsToGrid([], 3, 3);
    expect(result.cells).toEqual([]);
    expect(result.unmappedPockets).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("leaves gaps unmapped (not compacted) for a partially populated page", () => {
    // Only pockets 0, 2, 4, 8 occupied.
    const boxes = [boxAt(0.15, 0.15), boxAt(0.85, 0.15), boxAt(0.5, 0.5), boxAt(0.85, 0.85)];
    const result = mapCardsToGrid(boxes, 3, 3);
    expect(result.cells.map((c) => c.pocketIndex)).toEqual([0, 2, 4, 8]);
    expect(result.unmappedPockets).toEqual([1, 3, 5, 6, 7]);
  });

  it("indexes a 3x4 layout row-major (pocketIndex = row*4 + col)", () => {
    const boxes = [boxAt(0.9, 0.1), boxAt(0.1, 0.9)];
    const result = mapCardsToGrid(boxes, 3, 4);
    expect(result.cells[0]).toEqual({ row: 0, col: 3, pocketIndex: 3 });
    expect(result.cells[1]).toEqual({ row: 2, col: 0, pocketIndex: 8 });
  });

  it("reports a conflict when two boxes land in the same pocket, without dropping either", () => {
    const boxes = [boxAt(0.1, 0.1), boxAt(0.15, 0.12)];
    const result = mapCardsToGrid(boxes, 3, 3);
    expect(result.cells).toHaveLength(2);
    expect(result.cells[0].pocketIndex).toBe(0);
    expect(result.cells[1].pocketIndex).toBe(0);
    expect(result.conflicts).toEqual([{ pocketIndex: 0, boxIndices: [0, 1] }]);
  });

  it("clamps an out-of-range/extreme center into the last row/col instead of dropping it", () => {
    const result = mapCardsToGrid([boxAt(0.999, 0.999)], 3, 3);
    expect(result.cells[0]).toEqual({ row: 2, col: 2, pocketIndex: 8 });
  });

  it("rounds a boundary-fraction center down to the lower-index cell (documented floor rule)", () => {
    // centerX/centerY exactly on the 1/3 boundary between col/row 0 and 1.
    const result = mapCardsToGrid([boxAt(1 / 3, 1 / 3)], 3, 3);
    expect(result.cells[0]).toEqual({ row: 1, col: 1, pocketIndex: 4 });
  });
});
