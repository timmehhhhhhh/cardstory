import { describe, expect, it } from "vitest";
import { binderJumpHref, findLiveBinderPlacements, parseBinderJumpParams } from "@/lib/binder/placement";
import type { Binder, BinderPocketRef } from "@/lib/binder/types";

/** A 3x3 (layoutId "9") binder with one page, pre-populated per `pockets` (defaults to all-empty). Same helper shape as remote-store.test.ts. */
function makeBinder(overrides: Partial<Binder> = {}, pockets: (BinderPocketRef | null)[] = Array.from({ length: 9 }, () => null)): Binder {
  return {
    id: "binder-1",
    name: "Test binder",
    layoutId: "9",
    coverColor: "black",
    pageBackground: "match-cover",
    status: "wip",
    gameFilter: null,
    pages: [{ id: "page-1", pockets }],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

const HOLDING_A: BinderPocketRef = { kind: "holding", holdingId: "h-a" };
const HOLDING_B: BinderPocketRef = { kind: "holding", holdingId: "h-b" };
const CATALOG_ONLY: BinderPocketRef = { kind: "catalog", catalogItemId: "pokemon:sv3pt5-136" };

describe("findLiveBinderPlacements", () => {
  it("ignores WIP binders entirely", () => {
    const binder = makeBinder({ status: "wip" }, [HOLDING_A, null, null, null, null, null, null, null, null]);
    const map = findLiveBinderPlacements([binder]);
    expect(map.size).toBe(0);
  });

  it("locates a holding placed in a live binder, with 1-based page/row/col", () => {
    // slot 4 in a 3-col grid -> row 2, col 2 (0-indexed slot 4 = row 1, col 1 -> +1 each)
    const pockets = Array.from({ length: 9 }, () => null) as (BinderPocketRef | null)[];
    pockets[4] = HOLDING_A;
    const binder = makeBinder({ status: "live", id: "binder-live", name: "My Live Binder" }, pockets);
    const map = findLiveBinderPlacements([binder]);
    expect(map.get("h-a")).toEqual([
      {
        binderId: "binder-live",
        binderName: "My Live Binder",
        pageId: "page-1",
        pageNumber: 1,
        slotIndex: 4,
        row: 2,
        col: 2,
      },
    ]);
  });

  it("ignores catalog-only ('not owned') and empty pockets", () => {
    const binder = makeBinder({ status: "live" }, [CATALOG_ONLY, null, null, null, null, null, null, null, null]);
    const map = findLiveBinderPlacements([binder]);
    expect(map.size).toBe(0);
  });

  it("collects every placement when the same holding is filed more than once", () => {
    const pockets = Array.from({ length: 9 }, () => null) as (BinderPocketRef | null)[];
    pockets[0] = HOLDING_A;
    pockets[8] = HOLDING_A;
    const liveBinder = makeBinder({ status: "live", id: "binder-1" }, pockets);
    const otherPockets = Array.from({ length: 9 }, () => null) as (BinderPocketRef | null)[];
    otherPockets[1] = HOLDING_A;
    const secondLiveBinder = makeBinder(
      { status: "live", id: "binder-2", name: "Second binder", pages: [{ id: "page-2", pockets: otherPockets }] },
    );
    const map = findLiveBinderPlacements([liveBinder, secondLiveBinder]);
    expect(map.get("h-a")).toHaveLength(3);
    expect(map.get("h-a")!.map((p) => p.binderId)).toEqual(["binder-1", "binder-1", "binder-2"]);
  });

  it("keeps holdings from different binders/holdings separate", () => {
    const pockets = [HOLDING_A, HOLDING_B, null, null, null, null, null, null, null] as (BinderPocketRef | null)[];
    const binder = makeBinder({ status: "live" }, pockets);
    const map = findLiveBinderPlacements([binder]);
    expect(map.size).toBe(2);
    expect(map.get("h-a")).toHaveLength(1);
    expect(map.get("h-b")).toHaveLength(1);
  });
});

describe("binderJumpHref", () => {
  it("builds a /binder deep link carrying binderId/pageId/slotIndex", () => {
    const href = binderJumpHref("/binder", {
      binderId: "b1",
      binderName: "My Binder",
      pageId: "p2",
      pageNumber: 2,
      slotIndex: 5,
      row: 2,
      col: 3,
    });
    expect(href).toBe("/binder?binderId=b1&pageId=p2&slotIndex=5");
  });

  it("targets /business/binder when given that base path", () => {
    const href = binderJumpHref("/business/binder", {
      binderId: "b1",
      binderName: "Biz Binder",
      pageId: "p1",
      pageNumber: 1,
      slotIndex: 0,
      row: 1,
      col: 1,
    });
    expect(href.startsWith("/business/binder?")).toBe(true);
  });
});

describe("parseBinderJumpParams", () => {
  it("round-trips a binderJumpHref's query string", () => {
    expect(parseBinderJumpParams({ binderId: "b1", pageId: "p2", slotIndex: "5" })).toEqual({
      binderId: "b1",
      pageId: "p2",
      slotIndex: 5,
    });
  });

  it("accepts slotIndex 0", () => {
    expect(parseBinderJumpParams({ binderId: "b1", pageId: "p1", slotIndex: "0" })).toEqual({
      binderId: "b1",
      pageId: "p1",
      slotIndex: 0,
    });
  });

  it("returns null when any param is missing (e.g. a bare /binder visit)", () => {
    expect(parseBinderJumpParams({})).toBeNull();
    expect(parseBinderJumpParams({ binderId: "b1" })).toBeNull();
    expect(parseBinderJumpParams({ binderId: "b1", pageId: "p1" })).toBeNull();
  });

  it("returns null for a non-integer or negative slotIndex", () => {
    expect(parseBinderJumpParams({ binderId: "b1", pageId: "p1", slotIndex: "not-a-number" })).toBeNull();
    expect(parseBinderJumpParams({ binderId: "b1", pageId: "p1", slotIndex: "1.5" })).toBeNull();
    expect(parseBinderJumpParams({ binderId: "b1", pageId: "p1", slotIndex: "-1" })).toBeNull();
  });
});
