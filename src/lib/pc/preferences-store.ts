"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Preferences, ViewMode } from "@/lib/pc/types";
import type { SupportedCurrency } from "@/lib/constants";

const STORAGE_KEY = "cardstory:preferences:v1";

function defaultPreferences(): Preferences {
  return {
    currency: "USD",
    theme: "dark",
    viewMode: "list",
    lastUsedCostBasisCurrency: "USD",
    businessMode: false,
    quickAdd: false,
  };
}

export interface PCPreferencesState {
  /** Which PC is "active" in this tab — per-browser, not account data (see below). */
  activePCId: string;
  preferences: Preferences;
  setCurrency: (currency: SupportedCurrency) => void;
  setViewMode: (mode: ViewMode) => void;
  setLastUsedCostBasisCurrency: (currency: SupportedCurrency) => void;
  setBusinessMode: (businessMode: boolean) => void;
  setQuickAdd: (quickAdd: boolean) => void;
  setActivePC: (pcId: string) => void;
}

/**
 * Per-browser UI state that was never account data, even for a signed-in
 * user — which PC is "active" in this tab, and display preferences
 * (currency, view mode, business mode, quick add). Split out of the old
 * useLocalPCStore (src/lib/pc/local-store.ts, deleted along with guest/local
 * PC storage when an account became required to use the app) so
 * useRemotePCStore (src/lib/pc/remote-store.ts) still has somewhere local to
 * read/write these from — a signed-in user's currency display preference
 * doesn't belong on the server any more than it did before accounts were
 * required.
 *
 * `activePCId` starts empty; useRemotePCStore falls back to the first PC
 * the server returns until this is set (see its `activePCId` memo), the
 * same fallback the old local-store default PC used to make unnecessary.
 */
export const usePCPreferencesStore = create<PCPreferencesState>()(
  persist(
    (set) => ({
      activePCId: "",
      preferences: defaultPreferences(),

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
      setActivePC: (pcId) => set({ activePCId: pcId }),
    }),
    { name: STORAGE_KEY, version: 1 }
  )
);
