"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  pocketCount,
  type Binder,
  type BinderCoverColorId,
  type BinderLayoutId,
  type BinderPage,
  type BinderPocketRef,
  type BinderStatus,
  type BinderStoreDataV2,
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
    coverColor: "espresso",
    status: "wip",
    pages: [emptyPage(pocketCount("9"))],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function defaultState(): BinderStoreDataV2 {
  const main = defaultBinder();
  return {
    schemaVersion: 2,
    activeBinderId: main.id,
    binders: [main],
    showNumberTags: true,
    showNotOwnedTags: true,
  };
}

/**
 * Re-chunks every placed card into pages sized for `slots` pockets each,
 * preserving reading order (page by page, slot by slot) and existing page
 * ids where possible. Never drops a placed card — extra pages are added if
 * the new layout has fewer pockets per page than the old one.
 */
function reflowPages(pages: BinderPage[], slots: number): BinderPage[] {
  const cards = pages.flatMap((p) => p.pockets).filter((ref): ref is BinderPocketRef => ref != null);
  const pageCount = Math.max(pages.length, Math.ceil(cards.length / slots) || 1);
  return Array.from({ length: pageCount }, (_, i) => {
    const slice = cards.slice(i * slots, (i + 1) * slots);
    return {
      id: pages[i]?.id ?? id(),
      pockets: Array.from({ length: slots }, (_, s) => slice[s] ?? null),
    };
  });
}

export interface BinderActions {
  createBinder: (name: string, layoutId?: BinderLayoutId) => string;
  renameBinder: (binderId: string, name: string) => void;
  deleteBinder: (binderId: string) => void;
  setActiveBinder: (binderId: string) => void;
  setCoverColor: (binderId: string, color: BinderCoverColorId) => void;
  setLayout: (binderId: string, layoutId: BinderLayoutId) => void;
  setStatus: (binderId: string, status: BinderStatus) => void;
  setShowNumberTags: (show: boolean) => void;
  setShowNotOwnedTags: (show: boolean) => void;

  addPage: (binderId: string) => void;
  removePage: (binderId: string, pageId: string) => void;

  placeCard: (binderId: string, pageId: string, slotIndex: number, ref: BinderPocketRef | null) => void;
  /** Removes every placement referencing a holding — call when a holding is deleted from the pc. Catalog-kind pockets are untouched (no Holding backs them). */
  removeHoldingEverywhere: (holdingId: string) => void;
}

export type BinderState = BinderStoreDataV2 & BinderActions;

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
    (set) => ({
      ...defaultState(),

      createBinder: (name, layoutId = "9") => {
        const b: Binder = {
          id: id(),
          name,
          layoutId,
          coverColor: "espresso",
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

      setStatus: (binderId, status) => updateBinder(set, binderId, (b) => ({ ...b, status })),

      setLayout: (binderId, layoutId) =>
        updateBinder(set, binderId, (b) => ({
          ...b,
          layoutId,
          pages: reflowPages(b.pages, pocketCount(layoutId)),
        })),

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
        updateBinder(set, binderId, (b) => ({
          ...b,
          pages: b.pages.map((p) =>
            p.id !== pageId
              ? p
              : { ...p, pockets: p.pockets.map((r, i) => (i === slotIndex ? ref : r)) }
          ),
        })),

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
      version: 2,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return defaultState();
        const p = persisted as Record<string, unknown>;
        const schemaVersion = typeof p.schemaVersion === "number" ? p.schemaVersion : 1;

        // v1 pockets were bare `holdingId | null`; v2 wraps them in a
        // discriminated ref so a pocket can also point at a bare catalog
        // item the user doesn't own yet (see types.ts's BinderPocketRef).
        const binders = Array.isArray(p.binders)
          ? (p.binders as Record<string, unknown>[]).map((b) => ({
              ...b,
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
          schemaVersion: 2,
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
