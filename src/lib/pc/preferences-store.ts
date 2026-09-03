"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_HOLDING_FILTERS,
  type GroupField,
  type HoldingFilters,
  type Preferences,
  type SortDirection,
  type SortField,
  type ViewMode,
} from "@/lib/pc/types";
import type { SupportedCurrency } from "@/lib/constants";

// A new, dedicated key — deliberately not "cardstory:portfolio:v1" (the old
// combined pcs/watchlist/preferences blob that key names now belong to
// history, see src/components/auth/pc-import-prompt.tsx). Preferences are
// low-stakes UI defaults, not collection data, so resetting them once for
// existing browsers is an acceptable trade for not carrying the old
// localStorage-PC-store shape forward indefinitely.
const STORAGE_KEY = "cardstory:pc-preferences:v1";

function defaultPreferences(): Preferences {
  return {
    currency: "USD",
    theme: "dark",
    // The detail-dense list is the default read of a collection; gallery
    // is opt-in via ViewModeToggle (src/app/pc/_components).
    viewMode: "list",
    // Newest-added first — matches the order holdings have always
    // effectively appeared in, so this is a no-op default for existing users.
    sortField: "dateAdded",
    sortDirection: "desc",
    // Flat, ungrouped list is the default read of a collection — matches
    // the order holdings have always effectively appeared in, so this is a
    // no-op default for existing users.
    groupField: "none",
    lastUsedCostBasisCurrency: "USD",
    defaultCostBasisCurrency: null,
    businessMode: false,
    quickAdd: false,
    holdingFilters: DEFAULT_HOLDING_FILTERS,
  };
}

export interface PCPreferencesState {
  /**
   * The last PC the user was looking at. Empty string until either a local
   * pick is made or src/lib/pc/remote-store.ts syncs it to the signed-in
   * account's first PC — never a value this store invents on its own.
   */
  activePCId: string;
  preferences: Preferences;

  setActivePC: (pcId: string) => void;
  setCurrency: (currency: SupportedCurrency) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  setGroupField: (field: GroupField) => void;
  setLastUsedCostBasisCurrency: (currency: SupportedCurrency) => void;
  setDefaultCostBasisCurrency: (currency: SupportedCurrency | null) => void;
  setBusinessMode: (businessMode: boolean) => void;
  setQuickAdd: (quickAdd: boolean) => void;
  setHoldingFilters: (holdingFilters: HoldingFilters) => void;
}

/**
 * Per-browser, not account, state: which PC is active and the handful of
 * display/workflow toggles under Preferences. Read by both
 * src/lib/pc/remote-store.ts (signed-in users) and, historically, the
 * anonymous local pc store it replaced — none of this ever needed to be
 * server-backed, since it describes how this browser likes to look at the
 * data, not the data itself.
 */
export const usePCPreferencesStore = create<PCPreferencesState>()(
  persist(
    (set) => ({
      activePCId: "",
      preferences: defaultPreferences(),

      setActivePC: (activePCId) => set({ activePCId }),
      setCurrency: (currency) =>
        set((s) => ({ preferences: { ...s.preferences, currency } })),
      setViewMode: (viewMode) =>
        set((s) => ({ preferences: { ...s.preferences, viewMode } })),
      setSortField: (sortField) =>
        set((s) => ({ preferences: { ...s.preferences, sortField } })),
      setSortDirection: (sortDirection) =>
        set((s) => ({ preferences: { ...s.preferences, sortDirection } })),
      setGroupField: (groupField) =>
        set((s) => ({ preferences: { ...s.preferences, groupField } })),
      setLastUsedCostBasisCurrency: (lastUsedCostBasisCurrency) =>
        set((s) => ({ preferences: { ...s.preferences, lastUsedCostBasisCurrency } })),
      setDefaultCostBasisCurrency: (defaultCostBasisCurrency) =>
        set((s) => ({ preferences: { ...s.preferences, defaultCostBasisCurrency } })),
      setBusinessMode: (businessMode) =>
        set((s) => ({ preferences: { ...s.preferences, businessMode } })),
      setQuickAdd: (quickAdd) =>
        set((s) => ({ preferences: { ...s.preferences, quickAdd } })),
      setHoldingFilters: (holdingFilters) =>
        set((s) => ({ preferences: { ...s.preferences, holdingFilters } })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // Default merge replaces `preferences` wholesale with whatever was
      // persisted — fine until a new preference (like sortField/
      // sortDirection here) is added after some browsers already have this
      // key stored, which would otherwise leave that field undefined
      // instead of falling back to defaultPreferences(). Merge `preferences`
      // one level deep so new fields always get their default.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PCPreferencesState>;
        return {
          ...current,
          ...p,
          preferences: { ...current.preferences, ...p.preferences },
        };
      },
    }
  )
);
