"use client";

import * as React from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { id } from "@/lib/pc/id";
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
  type PageBackground,
} from "@/lib/binder/types";

const QUERY_KEY = ["binders"] as const;

interface BinderPreferences {
  activeBinderId: string | null;
  showNumberTags: boolean;
  showNotOwnedTags: boolean;
}

interface BinderQueryData {
  binders: Binder[];
  preferences: BinderPreferences;
}

const DEFAULT_QUERY_DATA: BinderQueryData = {
  binders: [],
  preferences: { activeBinderId: null, showNumberTags: true, showNotOwnedTags: true },
};

async function fetchBinders(): Promise<BinderQueryData> {
  const res = await fetch("/api/binder");
  if (!res.ok) throw new Error("Failed to load binders");
  return (await res.json()) as BinderQueryData;
}

/**
 * Imperative snapshot read for call sites that run outside render (e.g.
 * src/app/binder/import/_components/import-client.tsx's ensureBinderPageAt,
 * which loops "create a page, then look at the just-updated binder" —
 * the same shape the old zustand store's `useBinderStore.getState()` gave
 * it, now backed by the query cache instead of a vanilla store). Only
 * meaningful right after a `patch()` above has run — reads whatever the
 * cache currently holds, which is exactly what the optimistic mutations
 * below write synchronously.
 */
export function getBindersSnapshot(queryClient: QueryClient): Binder[] {
  return queryClient.getQueryData<BinderQueryData>(QUERY_KEY)?.binders ?? DEFAULT_QUERY_DATA.binders;
}

function nowIso() {
  return new Date().toISOString();
}

function emptyPage(slots: number): BinderPage {
  return { id: id(), pockets: Array.from({ length: slots }, () => null) };
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
 * fewer pockets per page than the old one. Runs entirely client-side —
 * setLayout below sends the already-computed result to the server to
 * persist, it's never re-derived there (see manage.ts's doc comment).
 *
 * Custom-image groups can't be freely re-chunked like single-slot refs (a
 * span is a 2D shape, not a flat count): if the new grid is smaller than
 * the old one in either dimension on any page holding a custom image, the
 * whole reflow is refused so the caller can ask the user to remove the
 * image first rather than silently corrupting or dropping it. Otherwise
 * each custom group is re-anchored at the same (row, col) it already
 * occupied — still valid since the new grid is >= the old in both
 * dimensions — and every other (holding/catalog) ref flows into the
 * remaining slots in reading order.
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

/** User-facing message for each mutation's failure toast — same convention as src/lib/pc/remote-store.ts's table. */
const MUTATION_FAILURE_MESSAGES: Record<string, string> = {
  createBinder: "Couldn't create the binder.",
  renameBinder: "Couldn't rename the binder.",
  deleteBinder: "Couldn't delete the binder.",
  setCoverColor: "Couldn't update the cover color.",
  setPageBackground: "Couldn't update the page background.",
  setStatus: "Couldn't update the binder status.",
  setLayout: "Couldn't change the layout.",
  addPage: "Couldn't add a page.",
  removePage: "Couldn't remove that page.",
  placeCard: "Couldn't update that pocket.",
  placeCustomImage: "Couldn't place that image.",
  removeHoldingEverywhere: "Couldn't sync that removal to your binders.",
  setActiveBinder: "Couldn't remember which binder you had open.",
  setShowNumberTags: "Couldn't save that setting.",
  setShowNotOwnedTags: "Couldn't save that setting.",
};

/** Same "revert silently, but tell the user why" reasoning as logMutationFailure in src/lib/pc/remote-store.ts. */
async function logMutationFailure(action: string, res: Response | null, err?: unknown) {
  const fallback = MUTATION_FAILURE_MESSAGES[action] ?? "Something went wrong — please try again.";
  if (err) {
    toast.error(fallback);
    console.error(`[binder] ${action} failed`, err);
    return;
  }
  if (res) {
    const body = await res.text().catch(() => "<unreadable body>");
    const specific = (() => {
      try {
        const parsed = JSON.parse(body) as { error?: unknown };
        return typeof parsed.error === "string" ? parsed.error : null;
      } catch {
        return null;
      }
    })();
    toast.error(specific ?? fallback);
    console.error(`[binder] ${action} failed`, { status: res.status, body });
  }
}

export interface BinderState {
  activeBinderId: string;
  binders: Binder[];
  showNumberTags: boolean;
  showNotOwnedTags: boolean;

  createBinder: (name: string, layoutId?: BinderLayoutId) => string;
  renameBinder: (binderId: string, name: string) => void;
  deleteBinder: (binderId: string) => void;
  setActiveBinder: (binderId: string) => void;
  setCoverColor: (binderId: string, color: BinderCoverColorId) => void;
  setPageBackground: (binderId: string, value: PageBackground) => void;
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

/**
 * Server-backed Binder store for signed-in users — the only implementation
 * behind src/lib/binder/store.ts's pass-through, mirroring
 * src/lib/pc/remote-store.ts's shape: mutations optimistically patch the
 * React Query cache, fire the request, and on failure invalidate the cache
 * to refetch the server's actual state.
 *
 * setLayout/placeCustomImage stay synchronous with the same
 * `{ok, blockedBy|reason}` return shape the 3 consuming components rely
 * on: reflowPages/customSpanCells/overlap-checking run client-side first
 * to validate and compute the next state, the cache is patched
 * immediately, and only then does the network request go out in the
 * background — the server never re-runs this business logic, it just
 * persists what's already been computed (see manage.ts's doc comment).
 */
export function useRemoteBinderStore<T>(selector: (s: BinderState) => T, opts: { enabled: boolean }): T {
  const queryClient = useQueryClient();

  const { data = DEFAULT_QUERY_DATA } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchBinders,
    enabled: opts.enabled,
    staleTime: 30_000,
  });
  const { binders, preferences } = data;

  const patch = React.useCallback(
    (updater: (bs: Binder[]) => Binder[]) => {
      queryClient.setQueryData<BinderQueryData>(QUERY_KEY, (old) => {
        const base = old ?? DEFAULT_QUERY_DATA;
        return { ...base, binders: updater(base.binders) };
      });
    },
    [queryClient]
  );

  const patchPreferences = React.useCallback(
    (updater: (p: BinderPreferences) => BinderPreferences) => {
      queryClient.setQueryData<BinderQueryData>(QUERY_KEY, (old) => {
        const base = old ?? DEFAULT_QUERY_DATA;
        return { ...base, preferences: updater(base.preferences) };
      });
    },
    [queryClient]
  );

  const reconcile = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  const state: BinderState = React.useMemo(
    () => ({
      activeBinderId: preferences.activeBinderId ?? binders[0]?.id ?? "",
      binders,
      showNumberTags: preferences.showNumberTags,
      showNotOwnedTags: preferences.showNotOwnedTags,

      createBinder: (name, layoutId = "9") => {
        const newId = id();
        const page = emptyPage(pocketCount(layoutId));
        const b: Binder = {
          id: newId,
          name,
          layoutId,
          coverColor: "black",
          pageBackground: "match-cover",
          status: "wip",
          pages: [page],
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        patch((bs) => [...bs, b]);
        fetch("/api/binder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: newId,
            name,
            layoutId,
            coverColor: b.coverColor,
            pageBackground: b.pageBackground,
            status: b.status,
            pages: [{ id: page.id, pockets: page.pockets }],
          }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("createBinder", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("createBinder", null, err);
            reconcile();
          });
        return newId;
      },

      renameBinder: (binderId, name) => {
        patch((bs) => bs.map((b) => (b.id === binderId ? { ...b, name, updatedAt: nowIso() } : b)));
        fetch(`/api/binder/${binderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("renameBinder", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("renameBinder", null, err);
            reconcile();
          });
      },

      deleteBinder: (binderId) => {
        patch((bs) => {
          const remaining = bs.filter((b) => b.id !== binderId);
          return remaining;
        });
        patchPreferences((p) =>
          p.activeBinderId === binderId
            ? { ...p, activeBinderId: binders.find((b) => b.id !== binderId)?.id ?? null }
            : p
        );
        fetch(`/api/binder/${binderId}`, { method: "DELETE" })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("deleteBinder", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("deleteBinder", null, err);
            reconcile();
          });
      },

      setActiveBinder: (binderId) => {
        patchPreferences((p) => ({ ...p, activeBinderId: binderId }));
        fetch("/api/binder/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeBinderId: binderId }),
        }).catch((err) => logMutationFailure("setActiveBinder", null, err));
      },

      setCoverColor: (binderId, color) => {
        patch((bs) => bs.map((b) => (b.id === binderId ? { ...b, coverColor: color, updatedAt: nowIso() } : b)));
        fetch(`/api/binder/${binderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coverColor: color }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("setCoverColor", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("setCoverColor", null, err);
            reconcile();
          });
      },

      setPageBackground: (binderId, value) => {
        patch((bs) => bs.map((b) => (b.id === binderId ? { ...b, pageBackground: value, updatedAt: nowIso() } : b)));
        fetch(`/api/binder/${binderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageBackground: value }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("setPageBackground", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("setPageBackground", null, err);
            reconcile();
          });
      },

      setStatus: (binderId, status) => {
        patch((bs) => bs.map((b) => (b.id === binderId ? { ...b, status, updatedAt: nowIso() } : b)));
        fetch(`/api/binder/${binderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("setStatus", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("setStatus", null, err);
            reconcile();
          });
      },

      setShowNumberTags: (show) => {
        patchPreferences((p) => ({ ...p, showNumberTags: show }));
        fetch("/api/binder/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ showNumberTags: show }),
        }).catch((err) => logMutationFailure("setShowNumberTags", null, err));
      },

      setShowNotOwnedTags: (show) => {
        patchPreferences((p) => ({ ...p, showNotOwnedTags: show }));
        fetch("/api/binder/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ showNotOwnedTags: show }),
        }).catch((err) => logMutationFailure("setShowNotOwnedTags", null, err));
      },

      setLayout: (binderId, layoutId) => {
        const binder = binders.find((b) => b.id === binderId);
        if (!binder) return { ok: true };
        const oldLayout = BINDER_LAYOUTS[binder.layoutId];
        const newLayout = BINDER_LAYOUTS[layoutId];
        const result = reflowPages(binder.pages, oldLayout.rows, oldLayout.cols, newLayout.rows, newLayout.cols);
        if (!result.ok) return result;
        patch((bs) =>
          bs.map((b) => (b.id === binderId ? { ...b, layoutId, pages: result.pages, updatedAt: nowIso() } : b))
        );
        fetch(`/api/binder/${binderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            layout: { layoutId, pages: result.pages.map((p) => ({ id: p.id, pockets: p.pockets })) },
          }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("setLayout", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("setLayout", null, err);
            reconcile();
          });
        return { ok: true };
      },

      addPage: (binderId) => {
        const binder = binders.find((b) => b.id === binderId);
        if (!binder) return;
        const page = emptyPage(pocketCount(binder.layoutId));
        patch((bs) => bs.map((b) => (b.id === binderId ? { ...b, pages: [...b.pages, page], updatedAt: nowIso() } : b)));
        fetch(`/api/binder/${binderId}/pages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: page.id, pockets: page.pockets }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("addPage", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("addPage", null, err);
            reconcile();
          });
      },

      removePage: (binderId, pageId) => {
        const binder = binders.find((b) => b.id === binderId);
        if (!binder) return;
        const remaining = binder.pages.filter((p) => p.id !== pageId);
        const fallback = remaining.length === 0 ? emptyPage(pocketCount(binder.layoutId)) : null;
        const nextPages = fallback ? [fallback] : remaining;
        patch((bs) => bs.map((b) => (b.id === binderId ? { ...b, pages: nextPages, updatedAt: nowIso() } : b)));
        fetch(`/api/binder/${binderId}/pages/${pageId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fallbackPage: fallback ? { id: fallback.id, pockets: fallback.pockets } : undefined }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("removePage", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("removePage", null, err);
            reconcile();
          });
      },

      placeCard: (binderId, pageId, slotIndex, ref) => {
        const binder = binders.find((b) => b.id === binderId);
        if (!binder) return;
        const cols = BINDER_LAYOUTS[binder.layoutId].cols;
        let nextPockets: (BinderPocketRef | null)[] | null = null;
        patch((bs) =>
          bs.map((b) => {
            if (b.id !== binderId) return b;
            return {
              ...b,
              updatedAt: nowIso(),
              pages: b.pages.map((p) => {
                if (p.id !== pageId) return p;
                let nextPage: BinderPage;
                if (ref === null) {
                  nextPage = clearCustomGroup(p, slotIndex, cols);
                } else if (isCustomCovered(p.pockets[slotIndex]) || ref.kind === "custom") {
                  // A "custom-covered" slot isn't independently assignable, and a
                  // "custom" ref must go through placeCustomImage for validation.
                  nextPage = p;
                } else {
                  nextPage = { ...p, pockets: p.pockets.map((r, i) => (i === slotIndex ? ref : r)) };
                }
                nextPockets = nextPage.pockets;
                return nextPage;
              }),
            };
          })
        );
        if (nextPockets) {
          fetch(`/api/binder/${binderId}/pages/${pageId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pockets: nextPockets }),
          })
            .then((res) => {
              if (!res.ok) {
                logMutationFailure("placeCard", res);
                reconcile();
              }
            })
            .catch((err) => {
              logMutationFailure("placeCard", null, err);
              reconcile();
            });
        }
      },

      placeCustomImage: (binderId, pageId, anchorSlotIndex, dataUrl, spanCols, spanRows) => {
        const binder = binders.find((b) => b.id === binderId);
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
        const nextPockets = [...page.pockets];
        for (const cell of cells) {
          nextPockets[cell] =
            cell === anchorSlotIndex ? { kind: "custom", dataUrl, spanCols, spanRows } : { kind: "custom-covered", anchorSlotIndex };
        }
        patch((bs) =>
          bs.map((b) =>
            b.id !== binderId
              ? b
              : {
                  ...b,
                  updatedAt: nowIso(),
                  pages: b.pages.map((p) => (p.id !== pageId ? p : { ...p, pockets: nextPockets })),
                }
          )
        );
        fetch(`/api/binder/${binderId}/pages/${pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pockets: nextPockets }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("placeCustomImage", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("placeCustomImage", null, err);
            reconcile();
          });
        return { ok: true };
      },

      removeHoldingEverywhere: (holdingId) => {
        patch((bs) =>
          bs.map((b) => ({
            ...b,
            pages: b.pages.map((p) => ({
              ...p,
              pockets: p.pockets.map((r) => (r?.kind === "holding" && r.holdingId === holdingId ? null : r)),
            })),
          }))
        );
        fetch("/api/binder/remove-holding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holdingId }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("removeHoldingEverywhere", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("removeHoldingEverywhere", null, err);
            reconcile();
          });
      },
    }),
    [binders, preferences, patch, patchPreferences, reconcile]
  );

  return selector(state);
}
