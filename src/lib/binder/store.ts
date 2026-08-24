"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  pocketCount,
  type Binder,
  type BinderCoverColorId,
  type BinderLayoutId,
  type BinderPage,
  type BinderStoreDataV1,
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
    pages: [emptyPage(pocketCount("9"))],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function defaultState(): BinderStoreDataV1 {
  const main = defaultBinder();
  return { schemaVersion: 1, activeBinderId: main.id, binders: [main], showNumberTags: true };
}

/**
 * Re-chunks every placed card into pages sized for `slots` pockets each,
 * preserving reading order (page by page, slot by slot) and existing page
 * ids where possible. Never drops a placed card — extra pages are added if
 * the new layout has fewer pockets per page than the old one.
 */
function reflowPages(pages: BinderPage[], slots: number): BinderPage[] {
  const cards = pages.flatMap((p) => p.pockets).filter((h): h is string => h != null);
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
  setShowNumberTags: (show: boolean) => void;

  addPage: (binderId: string) => void;
  removePage: (binderId: string, pageId: string) => void;

  placeCard: (binderId: string, pageId: string, slotIndex: number, holdingId: string | null) => void;
  /** Removes every placement referencing a holding — call when a holding is deleted from the pc. */
  removeHoldingEverywhere: (holdingId: string) => void;
}

export type BinderState = BinderStoreDataV1 & BinderActions;

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

      setCoverColor: (binderId, color) => updateBinder(set, binderId, (b) => ({ ...b, coverColor: color })),

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

      placeCard: (binderId, pageId, slotIndex, holdingId) =>
        updateBinder(set, binderId, (b) => ({
          ...b,
          pages: b.pages.map((p) =>
            p.id !== pageId
              ? p
              : { ...p, pockets: p.pockets.map((h, i) => (i === slotIndex ? holdingId : h)) }
          ),
        })),

      removeHoldingEverywhere: (holdingId) =>
        set((s) => ({
          binders: s.binders.map((b) => ({
            ...b,
            pages: b.pages.map((p) => ({
              ...p,
              pockets: p.pockets.map((h) => (h === holdingId ? null : h)),
            })),
          })),
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return defaultState();
        return { showNumberTags: true, ...persisted } as BinderState;
      },
    }
  )
);
