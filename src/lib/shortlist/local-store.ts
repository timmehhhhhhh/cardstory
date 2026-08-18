"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { id } from "@/lib/pc/local-store";
import type {
  NewShortlistItemInput,
  ShortlistItem,
  ShortlistStoreDataV1,
} from "@/lib/shortlist/types";

const STORAGE_KEY = "cardstory:shortlist:v1";

function nowIso() {
  return new Date().toISOString();
}

function defaultState(): ShortlistStoreDataV1 {
  return { schemaVersion: 1, items: [] };
}

export interface ShortlistActions {
  /**
   * Returns the new item's id synchronously (client-generated, same
   * convention as createPC) so the caller can focus the row it just
   * created — the add bar does exactly that.
   */
  addShortlistItem: (input: NewShortlistItemInput) => string;
  /**
   * One generic patch action rather than setQuantity/setPrice/setNotes,
   * matching updateHolding — the qty steppers, the price field and the
   * currency picker all funnel through it.
   */
  updateShortlistItem: (
    itemId: string,
    patch: Partial<Omit<ShortlistItem, "id" | "addedAt">>
  ) => void;
  removeShortlistItems: (itemIds: string[]) => void;
  clearShortlist: () => void;
}

export type ShortlistState = ShortlistStoreDataV1 & ShortlistActions;

/**
 * Logged-out half of the shortlist store. Same shape as
 * useRemoteShortlistStore so src/lib/shortlist/store.ts can switch between
 * them without any consuming component knowing which is live.
 *
 * Note there is no `selected` field: which items the user is about to buy
 * is a decision made once, at the till, and immediately consumed by
 * checkout — it lives as ephemeral React state in the page (see
 * shortlist-client.tsx), not here, so a checkbox tap never costs a write.
 */
export const useLocalShortlistStore = create<ShortlistState>()(
  persist(
    (set) => ({
      ...defaultState(),

      addShortlistItem: (input) => {
        const newId = id();
        const item: ShortlistItem = {
          ...input,
          id: newId,
          addedAt: nowIso(),
          updatedAt: nowIso(),
        };
        // Newest first, matching the server's `orderBy: { addedAt: "desc" }`
        // — the card you just scanned in the aisle should be at the top.
        set((s) => ({ items: [item, ...s.items] }));
        return newId;
      },

      updateShortlistItem: (itemId, patch) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === itemId ? { ...i, ...patch, updatedAt: nowIso() } : i
          ),
        })),

      removeShortlistItems: (itemIds) =>
        set((s) => ({ items: s.items.filter((i) => !itemIds.includes(i.id)) })),

      clearShortlist: () => set({ items: [] }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // schemaVersion bumps go here as `migrate: (persisted, fromVersion) => ...`.
      // When one lands, mirror the normalisation in pc-import-prompt.tsx too —
      // that component reads this key as raw JSON and so bypasses this hook.
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return defaultState();
        return persisted as ShortlistState;
      },
    }
  )
);
