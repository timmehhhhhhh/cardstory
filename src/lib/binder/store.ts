"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BINDER_LAYOUTS,
  customSpanCells,
  pocketCount,
  type Binder,
  type BinderCoverColorId,
  type BinderLayoutId,
  type BinderPage,
  type BinderPocketRef,
  type BinderStatus,
  type BinderStoreDataV3,
  type PocketBackground,
} from "@/lib/binder/types";

const STORAGE_KEY = "cardstory:binder:v1";

function id() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function emptyPage(slots: number): BinderPage {
  return { id: id(), pockets: Array.from({ length: slots }, () => null) };
}

function defaultBinder(): Binder {
  return {
    id: id(),
    name: "My Binder",
    layoutId: "9",
    coverColor: "black",
    pocketBackground: "match-cover",
    status: "wip",
    pages: [emptyPage(pocketCount("9"))],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function defaultState(): BinderStoreDataV3 {
  const main = defaultBinder();
  return {
    schemaVersion: 3,
    activeBinderId: main.id,
    binders: [main],
    showNumberTags: true,
    showNotOwnedTags: true,
  };
}

/** True for a ref that occupies a pocket some other custom-image ref governs — never independently placeable/clearable. */
function isCustomCovered(ref: BinderPocketRef | null): ref is Extract<BinderPocketRef, { kind: "custom-covered" }> {
  return ref?.kind === "custom-covered";
}

function isCustomAnchor(ref: BinderPocketRef | null): ref is Extract<BinderPocketRef, { kind: "custom" }> {
  return ref?.kind === "custom";
}

/** Clears every slot belonging to the custom-image group anchored at or covering `slotIndex` — the anchor plus all its "custom-covered" sentinels — so a group is always added/removed as one atomic unit. */
function clearCustomGroup(page: BinderPage, slotIndex: number, cols: number): BinderPage {
  const ref = page.pockets[slotIndex];
  if (!ref) return page;
  const anchorIndex = isCustomAnchor(ref) ? slotIndex : isCustomCovered(ref) ? ref.anchorSlotIndex : null;
  if (anchorIndex == null) {
    return { ...page, pockets: page.pockets.map((r, i) => (i === slotIndex ? null : r)) };
  }
  const anchor = page.pockets[anchorIndex];
  if (!isCustomAnchor(anchor)) {
    // Stale/inconsistent sentinel — just clear the one slot rather than throw.
    return { ...page, pockets: page.pockets.map((r, i) => (i === slotIndex ? null : r)) };
  }
  const covered = new Set(customSpanCells(anchorIndex, anchor.spanCols, anchor.spanRows, cols));
  return { ...page, pockets: page.pockets.map((r, i) => (covered.has(i) ? null : r)) };
}

export type SetLayoutResult = { ok: true } | { ok: false; blockedBy: { pageNumber: number }[] };
export type PlaceCustomImageResult = { ok: true } | { ok: false; reason: "out-of-bounds" | "overlap" };

/**
 * Re-chunks every placed card into pages sized for the new `rows` × `cols`
 * grid, preserving reading order and existing page ids where possible.
 * Never drops a placed card — extra pages are added if the new layout has
 * fewer pockets per page than the old one.
 *
 * Custom-image groups can't be freely re-chunked like single-slot refs (a
 * span is a 2D shape, not a flat count): if the new grid is smaller than
 * the old one in either dimension on any page holding a custom image, the
 * whole reflow is refused so the caller can ask the user to remove the
 * image first rather than silently corrupting or dropping it. Otherwise
 * each custom group is re-anchored at the same (row, col) it already
 * occupied — still valid since the new grid is >= the old in both
 * dimensions — and every other (holding/catalog) ref flows into the
 * remaining slots in reading order, same as before this function existed.
 */
function reflowPages(
  pages: BinderPage[],
  oldRows: number,
  oldCols: number,
  rows: number,
  cols: number
): { ok: true; pages: BinderPage[] } | { ok: false; blockedBy: { pageNumber: number }[] } {
  if (rows < oldRows || cols < oldCols) {
    const blockedBy = pages
      .map((page, i) => ({ pageNumber: i + 1, hasCustom: page.pockets.some((r) => r?.kind === "custom") }))
      .filter((p) => p.hasCustom)
      .map(({ pageNumber }) => ({ pageNumber }));
    if (blockedBy.length > 0) return { ok: false, blockedBy };
  }

  const slots = rows * cols;
  const simpleCards: BinderPocketRef[] = [];

  const pagesWithCustomsPlaced = pages.map((page, pageIdx) => {
    const pockets: (BinderPocketRef | null)[] = Array.from({ length: slots }, () => null);
    page.pockets.forEach((ref, oldIndex) => {
      if (!ref || ref.kind === "custom-covered") return; // covered slots are re-derived from their anchor below
      if (ref.kind === "custom") {
        const anchorRow = Math.floor(oldIndex / oldCols);
        const anchorCol = oldIndex % oldCols;
        const newAnchorIndex = anchorRow * cols + anchorCol;
        for (const cell of customSpanCells(newAnchorIndex, ref.spanCols, ref.spanRows, cols)) {
          pockets[cell] = cell === newAnchorIndex ? ref : { kind: "custom-covered", anchorSlotIndex: newAnchorIndex };
        }
        return;
      }
      simpleCards.push(ref);
    });
    return { id: pages[pageIdx]?.id ?? id(), pockets };
  });

  let cardCursor = 0;
  const resultPages: BinderPage[] = pagesWithCustomsPlaced.map(({ id: pageId, pockets }) => {
    for (let i = 0; i < pockets.length && cardCursor < simpleCards.length; i++) {
      if (pockets[i] == null) pockets[i] = simpleCards[cardCursor++];
    }
    return { id: pageId, pockets };
  });

  while (cardCursor < simpleCards.length) {
    const pockets: (BinderPocketRef | null)[] = Array.from({ length: slots }, () => null);
    for (let i = 0; i < pockets.length && cardCursor < simpleCards.length; i++) {
      pockets[i] = simpleCards[cardCursor++];
    }
    resultPages.push({ id: id(), pockets });
  }

  return { ok: true, pages: resultPages };
}

export interface BinderActions {
  createBinder: (name: string, layoutId?: BinderLayoutId) => string;
  renameBinder: (binderId: string, name: string) => void;
  deleteBinder: (binderId: string) => void;
  setActiveBinder: (binderId: string) => void;
  setCoverColor: (binderId: string, color: BinderCoverColorId) => void;
  setPocketBackground: (binderId: string, value: PocketBackground) => void;
  /** Returns `{ ok: false }` (without applying anything) when shrinking the layout would strand a custom image's span — see reflowPages. */
  setLayout: (binderId: string, layoutId: BinderLayoutId) => SetLayoutResult;
  setStatus: (binderId: string, status: BinderStatus) => void;
  setShowNumberTags: (show: boolean) => void;
  setShowNotOwnedTags: (show: boolean) => void;

  addPage: (binderId: string) => void;
  removePage: (binderId: string, pageId: string) => void;

  /** Places/clears a single-slot ref. Clearing (`ref: null`) a custom-image anchor or any of its covered slots clears the whole group atomically. Never place a "custom" ref directly — use placeCustomImage. */
  placeCard: (binderId: string, pageId: string, slotIndex: number, ref: BinderPocketRef | null) => void;
  /** Validates the span fits the page and doesn't overlap anything, then atomically writes the anchor + its "custom-covered" sentinels. */
  placeCustomImage: (
    binderId: string,
    pageId: string,
    anchorSlotIndex: number,
    dataUrl: string,
    spanCols: number,
    spanRows: number
  ) => PlaceCustomImageResult;
  /** Removes every placement referencing a holding — call when a holding is deleted from the pc. Catalog-kind pockets are untouched (no Holding backs them). */
  removeHoldingEverywhere: (holdingId: string) => void;
}

export type BinderState = BinderStoreDataV3 & BinderActions;

function updateBinder(
  set: (fn: (s: BinderState) => Partial<BinderState>) => void,
  binderId: string,
  fn: (b: Binder) => Binder
) {
  set((s) => ({
    binders: s.binders.map((b) => (b.id === binderId ? { ...fn(b), updatedAt: nowIso() } : b)),
  }));
}

export const useBinderStore = create<BinderState>()(
  persist(
    (set, get) => ({
      ...defaultState(),

      createBinder: (name, layoutId = "9") => {
        const b: Binder = {
          id: id(),
          name,
          layoutId,
          coverColor: "black",
          pocketBackground: "match-cover",
          status: "wip",
          pages: [emptyPage(pocketCount(layoutId))],
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set((s) => ({ binders: [...s.binders, b] }));
        return b.id;
      },

      renameBinder: (binderId, name) => updateBinder(set, binderId, (b) => ({ ...b, name })),

      deleteBinder: (binderId) =>
        set((s) => {
          const remaining = s.binders.filter((b) => b.id !== binderId);
          const binders = remaining.length > 0 ? remaining : [defaultBinder()];
          const activeBinderId = s.activeBinderId === binderId ? binders[0].id : s.activeBinderId;
          return { binders, activeBinderId };
        }),

      setActiveBinder: (binderId) => set({ activeBinderId: binderId }),

      setShowNumberTags: (show) => set({ showNumberTags: show }),

      setShowNotOwnedTags: (show) => set({ showNotOwnedTags: show }),

      setCoverColor: (binderId, color) => updateBinder(set, binderId, (b) => ({ ...b, coverColor: color })),

      setPocketBackground: (binderId, value) =>
        updateBinder(set, binderId, (b) => ({ ...b, pocketBackground: value })),

      setStatus: (binderId, status) => updateBinder(set, binderId, (b) => ({ ...b, status })),

      setLayout: (binderId, layoutId) => {
        const binder = get().binders.find((b) => b.id === binderId);
        if (!binder) return { ok: true };
        const oldLayout = BINDER_LAYOUTS[binder.layoutId];
        const newLayout = BINDER_LAYOUTS[layoutId];
        const result = reflowPages(binder.pages, oldLayout.rows, oldLayout.cols, newLayout.rows, newLayout.cols);
        if (!result.ok) return result;
        updateBinder(set, binderId, (b) => ({ ...b, layoutId, pages: result.pages }));
        return { ok: true };
      },

      addPage: (binderId) =>
        updateBinder(set, binderId, (b) => ({
          ...b,
          pages: [...b.pages, emptyPage(pocketCount(b.layoutId))],
        })),

      removePage: (binderId, pageId) =>
        updateBinder(set, binderId, (b) => {
          const pages = b.pages.filter((p) => p.id !== pageId);
          return { ...b, pages: pages.length > 0 ? pages : [emptyPage(pocketCount(b.layoutId))] };
        }),

      placeCard: (binderId, pageId, slotIndex, ref) =>
        updateBinder(set, binderId, (b) => {
          const cols = BINDER_LAYOUTS[b.layoutId].cols;
          return {
            ...b,
            pages: b.pages.map((p) => {
              if (p.id !== pageId) return p;
              if (ref === null) return clearCustomGroup(p, slotIndex, cols);
              // A "custom-covered" slot isn't independently assignable, and a
              // "custom" ref must go through placeCustomImage for validation.
              if (isCustomCovered(p.pockets[slotIndex]) || ref.kind === "custom") return p;
              return { ...p, pockets: p.pockets.map((r, i) => (i === slotIndex ? ref : r)) };
            }),
          };
        }),

      placeCustomImage: (binderId, pageId, anchorSlotIndex, dataUrl, spanCols, spanRows) => {
        const binder = get().binders.find((b) => b.id === binderId);
        if (!binder) return { ok: false, reason: "out-of-bounds" };
        const page = binder.pages.find((p) => p.id === pageId);
        if (!page) return { ok: false, reason: "out-of-bounds" };
        const { rows, cols } = BINDER_LAYOUTS[binder.layoutId];
        const anchorRow = Math.floor(anchorSlotIndex / cols);
        const anchorCol = anchorSlotIndex % cols;
        if (anchorCol + spanCols > cols || anchorRow + spanRows > rows) {
          return { ok: false, reason: "out-of-bounds" };
        }
        const cells = customSpanCells(anchorSlotIndex, spanCols, spanRows, cols);
        if (cells.some((cell) => page.pockets[cell] != null)) {
          return { ok: false, reason: "overlap" };
        }
        updateBinder(set, binderId, (b) => ({
          ...b,
          pages: b.pages.map((p) => {
            if (p.id !== pageId) return p;
            const pockets = [...p.pockets];
            for (const cell of cells) {
              pockets[cell] =
                cell === anchorSlotIndex ? { kind: "custom", dataUrl, spanCols, spanRows } : { kind: "custom-covered", anchorSlotIndex };
            }
            return { ...p, pockets };
          }),
        }));
        return { ok: true };
      },

      removeHoldingEverywhere: (holdingId) =>
        set((s) => ({
          binders: s.binders.map((b) => ({
            ...b,
            pages: b.pages.map((p) => ({
              ...p,
              pockets: p.pockets.map((r) => (r?.kind === "holding" && r.holdingId === holdingId ? null : r)),
            })),
          })),
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return defaultState();
        const p = persisted as Record<string, unknown>;
        const schemaVersion = typeof p.schemaVersion === "number" ? p.schemaVersion : 1;

        // v1 pockets were bare `holdingId | null`; v2 wraps them in a
        // discriminated ref so a pocket can also point at a bare catalog
        // item the user doesn't own yet (see types.ts's BinderPocketRef).
        // v3 adds pocketBackground and the "custom"/"custom-covered" ref
        // kinds — purely additive, so existing holding/catalog refs pass
        // through unchanged and a missing coverColor id (from the old
        // espresso/camel/... palette) is left as-is: coverColorValue()
        // already falls back to the first palette entry for unknown ids.
        const binders = Array.isArray(p.binders)
          ? (p.binders as Record<string, unknown>[]).map((b) => ({
              ...b,
              pocketBackground: (b.pocketBackground as PocketBackground | undefined) ?? "match-cover",
              status: (b.status as BinderStatus | undefined) ?? "wip",
              pages: Array.isArray(b.pages)
                ? (b.pages as Record<string, unknown>[]).map((page) => ({
                    ...page,
                    pockets: Array.isArray(page.pockets)
                      ? (page.pockets as unknown[]).map((slot) =>
                          schemaVersion >= 2
                            ? (slot as BinderPocketRef | null)
                            : typeof slot === "string"
                              ? ({ kind: "holding", holdingId: slot } satisfies BinderPocketRef)
                              : null
                        )
                      : [],
                  }))
                : [],
            }))
          : defaultState().binders;

        return {
          schemaVersion: 3,
          activeBinderId:
            (p.activeBinderId as string | undefined) ?? (binders[0] as Binder | undefined)?.id ?? defaultState().activeBinderId,
          binders: binders as Binder[],
          showNumberTags: (p.showNumberTags as boolean | undefined) ?? true,
          showNotOwnedTags: (p.showNotOwnedTags as boolean | undefined) ?? true,
        } as BinderState;
      },
    }
  )
);
