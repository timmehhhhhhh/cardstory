import { describe, expect, it } from "vitest";
import { computeMoveCustomImage, computeResizeCustomImage } from "@/lib/binder/remote-store";
import type { Binder, BinderPocketRef } from "@/lib/binder/types";

/** A 3x3 (layoutId "9") binder with one page, pre-populated per `pockets` (defaults to all-empty). */
function makeBinder(pockets: (BinderPocketRef | null)[] = Array.from({ length: 9 }, () => null)): Binder {
  return {
    id: "binder-1",
    name: "Test binder",
    layoutId: "9",
    coverColor: "black",
    pageBackground: "match-cover",
    status: "wip",
    pages: [{ id: "page-1", pockets }],
    createdAt: "",
    updatedAt: "",
  };
}

function withSecondPage(binder: Binder, pockets: (BinderPocketRef | null)[] = Array.from({ length: 9 }, () => null)): Binder {
  return { ...binder, pages: [...binder.pages, { id: "page-2", pockets }] };
}

const CUSTOM_1X2: BinderPocketRef = { kind: "custom", dataUrl: "data:image/png;base64,x", spanCols: 1, spanRows: 2 };
const COVERED_FROM_0: BinderPocketRef = { kind: "custom-covered", anchorSlotIndex: 0 };
const HOLDING_A: BinderPocketRef = { kind: "holding", holdingId: "h-a" };

describe("computeMoveCustomImage", () => {
  it("moves a group to an empty spot on the same page", () => {
    // anchor at slot 0 (1x2 — covers slot 0 and slot 3 in a 3-col grid)
    const binder = makeBinder([CUSTOM_1X2, null, null, COVERED_FROM_0, null, null, null, null, null]);
    const result = computeMoveCustomImage(binder, "page-1", 0, "page-1", 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pockets = result.pageUpdates["page-1"];
    expect(pockets[0]).toBeNull();
    expect(pockets[3]).toBeNull();
    expect(pockets[1]).toMatchObject({ kind: "custom", spanCols: 1, spanRows: 2 });
    expect(pockets[4]).toMatchObject({ kind: "custom-covered", anchorSlotIndex: 1 });
  });

  it("allows dropping a group back onto (a shift within) its own current cells without a false overlap", () => {
    const binder = makeBinder([CUSTOM_1X2, null, null, COVERED_FROM_0, null, null, null, null, null]);
    // Shift down by one row: covers 3 and 6 — slot 3 is one of the group's
    // own current cells, and must not be treated as "occupied by itself".
    const result = computeMoveCustomImage(binder, "page-1", 0, "page-1", 3);
    expect(result.ok).toBe(true);
  });

  it("rejects a destination that doesn't fit the layout", () => {
    const binder = makeBinder([CUSTOM_1X2, null, null, COVERED_FROM_0, null, null, null, null, null]);
    // Anchored at slot 2 (last column), a 1x2 span would need row 2 in that
    // column too, which is fine height-wise, but anchoring at slot 8 (last
    // cell) leaves no room for the second row — out of bounds.
    const result = computeMoveCustomImage(binder, "page-1", 0, "page-1", 8);
    expect(result).toEqual({ ok: false, reason: "out-of-bounds" });
  });

  it("rejects a destination that overlaps a different placed card", () => {
    const binder = makeBinder([CUSTOM_1X2, HOLDING_A, null, COVERED_FROM_0, null, null, null, null, null]);
    // Moving to anchor at slot 1 would cover slots 1 and 4; slot 1 already
    // holds a different card (not part of the moving group) — overlap.
    const result = computeMoveCustomImage(binder, "page-1", 0, "page-1", 1);
    expect(result).toEqual({ ok: false, reason: "overlap" });
  });

  it("moves a group across pages within the same binder, clearing the source and writing the destination independently", () => {
    let binder = makeBinder([CUSTOM_1X2, null, null, COVERED_FROM_0, null, null, null, null, null]);
    binder = withSecondPage(binder, [HOLDING_A, null, null, null, null, null, null, null, null]);
    const result = computeMoveCustomImage(binder, "page-1", 0, "page-2", 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pageUpdates["page-1"][0]).toBeNull();
    expect(result.pageUpdates["page-1"][3]).toBeNull();
    expect(result.pageUpdates["page-2"][1]).toMatchObject({ kind: "custom", spanCols: 1, spanRows: 2 });
    expect(result.pageUpdates["page-2"][4]).toMatchObject({ kind: "custom-covered", anchorSlotIndex: 1 });
    // The destination page's unrelated existing card is left untouched.
    expect(result.pageUpdates["page-2"][0]).toEqual(HOLDING_A);
  });

  it("rejects a cross-page destination overlapping an existing card there (no same-page exclusion applies)", () => {
    let binder = makeBinder([CUSTOM_1X2, null, null, COVERED_FROM_0, null, null, null, null, null]);
    binder = withSecondPage(binder, [HOLDING_A, null, null, null, null, null, null, null, null]);
    const result = computeMoveCustomImage(binder, "page-1", 0, "page-2", 0);
    expect(result).toEqual({ ok: false, reason: "overlap" });
  });

  it("fails defensively when the source slot isn't actually a custom anchor", () => {
    const binder = makeBinder([HOLDING_A, null, null, null, null, null, null, null, null]);
    const result = computeMoveCustomImage(binder, "page-1", 0, "page-1", 1);
    expect(result).toEqual({ ok: false, reason: "out-of-bounds" });
  });
});

describe("computeResizeCustomImage", () => {
  it("grows a group's span into empty cells", () => {
    const binder = makeBinder([CUSTOM_1X2, null, null, COVERED_FROM_0, null, null, null, null, null]);
    const result = computeResizeCustomImage(binder, "page-1", 0, 2, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pockets[0]).toMatchObject({ kind: "custom", spanCols: 2, spanRows: 2 });
    for (const cell of [1, 3, 4]) {
      expect(result.pockets[cell]).toMatchObject({ kind: "custom-covered", anchorSlotIndex: 0 });
    }
  });

  it("shrinks a group's span, freeing the vacated cells", () => {
    // Start as a 2x2 at anchor 0: covers 0,1,3,4.
    const anchor2x2: BinderPocketRef = { kind: "custom", dataUrl: "x", spanCols: 2, spanRows: 2 };
    const coveredFrom0: BinderPocketRef = { kind: "custom-covered", anchorSlotIndex: 0 };
    const binder = makeBinder([anchor2x2, coveredFrom0, null, coveredFrom0, coveredFrom0, null, null, null, null]);
    const result = computeResizeCustomImage(binder, "page-1", 0, 1, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pockets[0]).toMatchObject({ kind: "custom", spanCols: 1, spanRows: 1 });
    expect(result.pockets[1]).toBeNull();
    expect(result.pockets[3]).toBeNull();
    expect(result.pockets[4]).toBeNull();
  });

  it("rejects a span that doesn't fit the page from the fixed anchor", () => {
    const binder = makeBinder([CUSTOM_1X2, null, null, COVERED_FROM_0, null, null, null, null, null]);
    // 3 rows tall from row 0 exceeds the 3x3 grid's own row count only when
    // combined with an anchor that isn't row 0 — use col overflow instead:
    // anchor at slot 0, 4 cols wide exceeds a 3-col grid.
    const result = computeResizeCustomImage(binder, "page-1", 0, 4, 1);
    expect(result).toEqual({ ok: false, reason: "out-of-bounds" });
  });

  it("rejects growing into a cell occupied by a different placed card", () => {
    const binder = makeBinder([CUSTOM_1X2, HOLDING_A, null, COVERED_FROM_0, null, null, null, null, null]);
    // Growing to 2 cols wide would cover slot 1, which holds a different card.
    const result = computeResizeCustomImage(binder, "page-1", 0, 2, 2);
    expect(result).toEqual({ ok: false, reason: "overlap" });
  });

  it("fails defensively when the target slot isn't actually a custom anchor", () => {
    const binder = makeBinder([HOLDING_A, null, null, null, null, null, null, null, null]);
    const result = computeResizeCustomImage(binder, "page-1", 0, 1, 1);
    expect(result).toEqual({ ok: false, reason: "out-of-bounds" });
  });
});
