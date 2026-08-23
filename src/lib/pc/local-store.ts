"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Holding,
  HoldingKind,
  NewHoldingInput,
  PC,
  PCStoreDataV1,
  ViewMode,
  WatchlistItem,
} from "@/lib/pc/types";
import { pcKind } from "@/lib/pc/types";
import type { SupportedCurrency } from "@/lib/constants";

// Kept as "portfolio" (not "pc") so existing users' already-persisted
// localStorage data isn't orphaned by the PC rename.
const STORAGE_KEY = "cardstory:portfolio:v1";

export function id() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function defaultPC(): PC {
  return { id: id(), name: "Main", createdAt: nowIso(), holdings: [] };
}

function defaultState(): PCStoreDataV1 {
  const main = defaultPC();
  return {
    schemaVersion: 1,
    activePCId: main.id,
    pcs: [main],
    watchlist: [],
    preferences: {
      currency: "USD",
      theme: "dark",
      // The detail-dense list is the default read of a collection; gallery
      // is opt-in via ViewModeToggle (src/app/pc/_components).
      viewMode: "list",
      lastUsedCostBasisCurrency: "USD",
      businessMode: false,
      quickAdd: false,
    },
  };
}

export interface PCActions {
  setCurrency: (currency: SupportedCurrency) => void;
  setViewMode: (mode: ViewMode) => void;
  setLastUsedCostBasisCurrency: (currency: SupportedCurrency) => void;
  setBusinessMode: (businessMode: boolean) => void;
  setQuickAdd: (quickAdd: boolean) => void;

  createPC: (name: string) => string;
  renamePC: (pcId: string, name: string) => void;
  deletePC: (pcId: string) => void;
  setActivePC: (pcId: string) => void;
  /** Returns the id of the "Business Inventory" PC, creating it first if this is the first time it's needed. */
  ensureBusinessPC: () => string;

  /**
   * Promise-returning (even here, where it's always synchronous under the
   * hood) so callers share one shape with useRemotePCStore's addHolding,
   * which genuinely can fail server-side — see that file for why a caller
   * needs to be able to await/catch this instead of assuming it always
   * lands.
   */
  addHolding: (pcId: string, input: NewHoldingInput) => Promise<string>;
  updateHolding: (
    pcId: string,
    holdingId: string,
    patch: Partial<Omit<Holding, "id">>
  ) => void;
  removeHoldings: (pcId: string, holdingIds: string[]) => void;
  copyHoldings: (fromId: string, toId: string, holdingIds: string[]) => void;
  moveHoldings: (fromId: string, toId: string, holdingIds: string[]) => void;

  toggleWatchlist: (itemId: string, kind: HoldingKind, priceAtAdd: number | null) => void;
  isWatchlisted: (itemId: string) => boolean;
}

export type PCState = PCStoreDataV1 & PCActions;

/**
 * The anonymous, browser-only PC store — always used when logged
 * out, and still used for preferences/watchlist/activePCId even
 * when logged in (see src/lib/pc/store.ts, the switcher). Logic is
 * unchanged from before accounts existed, so anonymous behavior is
 * provably unaffected by the accounts feature.
 */
export const useLocalPCStore = create<PCState>()(
  persist(
    (set, get) => ({
      ...defaultState(),

      setCurrency: (currency) =>
        set((s) => ({ preferences: { ...s.preferences, currency } })),
      setViewMode: (viewMode) =>
        set((s) => ({ preferences: { ...s.preferences, viewMode } })),
      setLastUsedCostBasisCurrency: (lastUsedCostBasisCurrency) =>
        set((s) => ({ preferences: { ...s.preferences, lastUsedCostBasisCurrency } })),
      setBusinessMode: (businessMode) =>
        set((s) => ({ preferences: { ...s.preferences, businessMode } })),
      setQuickAdd: (quickAdd) =>
        set((s) => ({ preferences: { ...s.preferences, quickAdd } })),

      createPC: (name) => {
        const p: PC = { id: id(), name, createdAt: nowIso(), holdings: [] };
        set((s) => ({ pcs: [...s.pcs, p] }));
        return p.id;
      },
      ensureBusinessPC: () => {
        const existing = get().pcs.find((p) => pcKind(p) === "business");
        if (existing) return existing.id;
        const p: PC = {
          id: id(),
          name: "Business Inventory",
          kind: "business",
          createdAt: nowIso(),
          holdings: [],
        };
        set((s) => ({ pcs: [...s.pcs, p] }));
        return p.id;
      },
      renamePC: (pcId, name) =>
        set((s) => ({
          pcs: s.pcs.map((p) => (p.id === pcId ? { ...p, name } : p)),
        })),
      deletePC: (pcId) =>
        set((s) => {
          const remaining = s.pcs.filter((p) => p.id !== pcId);
          const pcs = remaining.length > 0 ? remaining : [defaultPC()];
          const activePCId =
            s.activePCId === pcId ? pcs[0].id : s.activePCId;
          return { pcs, activePCId };
        }),
      setActivePC: (pcId) => set({ activePCId: pcId }),

      addHolding: (pcId, input) => {
        const holding: Holding = {
          ...input,
          id: id(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set((s) => ({
          pcs: s.pcs.map((p) =>
            p.id === pcId ? { ...p, holdings: [...p.holdings, holding] } : p
          ),
        }));
        return Promise.resolve(holding.id);
      },
      updateHolding: (pcId, holdingId, patch) =>
        set((s) => ({
          pcs: s.pcs.map((p) =>
            p.id !== pcId
              ? p
              : {
                  ...p,
                  holdings: p.holdings.map((h) =>
                    h.id === holdingId ? { ...h, ...patch, updatedAt: nowIso() } : h
                  ),
                }
          ),
        })),
      removeHoldings: (pcId, holdingIds) =>
        set((s) => ({
          pcs: s.pcs.map((p) =>
            p.id === pcId
              ? { ...p, holdings: p.holdings.filter((h) => !holdingIds.includes(h.id)) }
              : p
          ),
        })),
      copyHoldings: (fromId, toId, holdingIds) =>
        set((s) => {
          const from = s.pcs.find((p) => p.id === fromId);
          if (!from) return s;
          const toCopy = from.holdings
            .filter((h) => holdingIds.includes(h.id))
            .map((h) => ({ ...h, id: id(), createdAt: nowIso(), updatedAt: nowIso() }));
          return {
            pcs: s.pcs.map((p) =>
              p.id === toId ? { ...p, holdings: [...p.holdings, ...toCopy] } : p
            ),
          };
        }),
      moveHoldings: (fromId, toId, holdingIds) => {
        get().copyHoldings(fromId, toId, holdingIds);
        get().removeHoldings(fromId, holdingIds);
      },

      toggleWatchlist: (itemId, kind, priceAtAdd) =>
        set((s) => {
          const exists = s.watchlist.some((w) => w.itemId === itemId);
          return {
            watchlist: exists
              ? s.watchlist.filter((w) => w.itemId !== itemId)
              : [...s.watchlist, { itemId, kind, addedAt: nowIso(), priceAtAdd }],
          };
        }),
      isWatchlisted: (itemId) => get().watchlist.some((w) => w.itemId === itemId),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      // schemaVersion bumps go here as `migrate: (persisted, fromVersion) => ...`
      migrate: (persisted, fromVersion) => {
        if (!persisted || typeof persisted !== "object") return defaultState();
        const state = persisted as PCState & { watchlist?: unknown };
        // v1 -> v2: watchlist went from a bare catalogItemId[] to
        // WatchlistItem[] (itemId + kind + addedAt + priceAtAdd), so this
        // feature has a date/price to show. Old entries only ever held a
        // TCG catalogItemId ("<gameId>:<externalId>", so ":" reliably means
        // "tcg" — the same disambiguation rule src/lib/catalog/search.ts
        // documents for CatalogItem vs SportsCardItem ids), and never
        // captured a price at the time, so priceAtAdd is honestly null
        // rather than fabricated.
        if (fromVersion < 2 && Array.isArray(state.watchlist)) {
          state.watchlist = (state.watchlist as unknown[]).map((entry): WatchlistItem =>
            typeof entry === "string"
              ? {
                  itemId: entry,
                  kind: entry.includes(":") ? "tcg" : "sports",
                  addedAt: nowIso(),
                  priceAtAdd: null,
                }
              : (entry as WatchlistItem)
          );
        }
        // v2 -> v3: preferences.viewMode became a real, user-facing setting
        // (ViewModeToggle). Until now nothing read it, so every persisted
        // value is the old "grid" default rather than anybody's choice —
        // honouring it would silently move existing users into the gallery.
        // Reset once to "list", which is what they've actually been seeing.
        if (fromVersion < 3 && state.preferences) {
          state.preferences = { ...state.preferences, viewMode: "list" };
        }
        return state as PCState;
      },
    }
  )
);
