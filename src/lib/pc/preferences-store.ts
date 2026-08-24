"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Preferences, ViewMode } from "@/lib/pc/types";
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
    lastUsedCostBasisCurrency: "USD",
    businessMode: false,
    quickAdd: false,
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
  setLastUsedCostBasisCurrency: (currency: SupportedCurrency) => void;
  setBusinessMode: (businessMode: boolean) => void;
  setQuickAdd: (quickAdd: boolean) => void;
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
      setLastUsedCostBasisCurrency: (lastUsedCostBasisCurrency) =>
        set((s) => ({ preferences: { ...s.preferences, lastUsedCostBasisCurrency } })),
      setBusinessMode: (businessMode) =>
        set((s) => ({ preferences: { ...s.preferences, businessMode } })),
      setQuickAdd: (quickAdd) =>
        set((s) => ({ preferences: { ...s.preferences, quickAdd } })),
    }),
    { name: STORAGE_KEY, version: 1 }
  )
);
