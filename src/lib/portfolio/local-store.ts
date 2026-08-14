"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Holding,
  NewHoldingInput,
  Portfolio,
  PortfolioStoreDataV1,
  ViewMode,
} from "@/lib/portfolio/types";
import type { SupportedCurrency } from "@/lib/constants";

const STORAGE_KEY = "cardstory:portfolio:v1";

export function id() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function defaultPortfolio(): Portfolio {
  return { id: id(), name: "Main", createdAt: nowIso(), holdings: [] };
}

function defaultState(): PortfolioStoreDataV1 {
  const main = defaultPortfolio();
  return {
    schemaVersion: 1,
    activePortfolioId: main.id,
    portfolios: [main],
    watchlist: [],
    preferences: { currency: "USD", theme: "dark", viewMode: "grid" },
  };
}

export interface PortfolioActions {
  setCurrency: (currency: SupportedCurrency) => void;
  setViewMode: (mode: ViewMode) => void;

  createPortfolio: (name: string) => string;
  renamePortfolio: (portfolioId: string, name: string) => void;
  deletePortfolio: (portfolioId: string) => void;
  setActivePortfolio: (portfolioId: string) => void;

  addHolding: (portfolioId: string, input: NewHoldingInput) => string;
  updateHolding: (
    portfolioId: string,
    holdingId: string,
    patch: Partial<Omit<Holding, "id">>
  ) => void;
  removeHoldings: (portfolioId: string, holdingIds: string[]) => void;
  copyHoldings: (fromId: string, toId: string, holdingIds: string[]) => void;
  moveHoldings: (fromId: string, toId: string, holdingIds: string[]) => void;

  toggleWatchlist: (catalogItemId: string) => void;
  isWatchlisted: (catalogItemId: string) => boolean;
}

export type PortfolioState = PortfolioStoreDataV1 & PortfolioActions;

/**
 * The anonymous, browser-only portfolio store — always used when logged
 * out, and still used for preferences/watchlist/activePortfolioId even
 * when logged in (see src/lib/portfolio/store.ts, the switcher). Logic is
 * unchanged from before accounts existed, so anonymous behavior is
 * provably unaffected by the accounts feature.
 */
export const useLocalPortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      ...defaultState(),

      setCurrency: (currency) =>
        set((s) => ({ preferences: { ...s.preferences, currency } })),
      setViewMode: (viewMode) =>
        set((s) => ({ preferences: { ...s.preferences, viewMode } })),

      createPortfolio: (name) => {
        const p: Portfolio = { id: id(), name, createdAt: nowIso(), holdings: [] };
        set((s) => ({ portfolios: [...s.portfolios, p] }));
        return p.id;
      },
      renamePortfolio: (portfolioId, name) =>
        set((s) => ({
          portfolios: s.portfolios.map((p) => (p.id === portfolioId ? { ...p, name } : p)),
        })),
      deletePortfolio: (portfolioId) =>
        set((s) => {
          const remaining = s.portfolios.filter((p) => p.id !== portfolioId);
          const portfolios = remaining.length > 0 ? remaining : [defaultPortfolio()];
          const activePortfolioId =
            s.activePortfolioId === portfolioId ? portfolios[0].id : s.activePortfolioId;
          return { portfolios, activePortfolioId };
        }),
      setActivePortfolio: (portfolioId) => set({ activePortfolioId: portfolioId }),

      addHolding: (portfolioId, input) => {
        const holding: Holding = {
          ...input,
          id: id(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set((s) => ({
          portfolios: s.portfolios.map((p) =>
            p.id === portfolioId ? { ...p, holdings: [...p.holdings, holding] } : p
          ),
        }));
        return holding.id;
      },
      updateHolding: (portfolioId, holdingId, patch) =>
        set((s) => ({
          portfolios: s.portfolios.map((p) =>
            p.id !== portfolioId
              ? p
              : {
                  ...p,
                  holdings: p.holdings.map((h) =>
                    h.id === holdingId ? { ...h, ...patch, updatedAt: nowIso() } : h
                  ),
                }
          ),
        })),
      removeHoldings: (portfolioId, holdingIds) =>
        set((s) => ({
          portfolios: s.portfolios.map((p) =>
            p.id === portfolioId
              ? { ...p, holdings: p.holdings.filter((h) => !holdingIds.includes(h.id)) }
              : p
          ),
        })),
      copyHoldings: (fromId, toId, holdingIds) =>
        set((s) => {
          const from = s.portfolios.find((p) => p.id === fromId);
          if (!from) return s;
          const toCopy = from.holdings
            .filter((h) => holdingIds.includes(h.id))
            .map((h) => ({ ...h, id: id(), createdAt: nowIso(), updatedAt: nowIso() }));
          return {
            portfolios: s.portfolios.map((p) =>
              p.id === toId ? { ...p, holdings: [...p.holdings, ...toCopy] } : p
            ),
          };
        }),
      moveHoldings: (fromId, toId, holdingIds) => {
        get().copyHoldings(fromId, toId, holdingIds);
        get().removeHoldings(fromId, holdingIds);
      },

      toggleWatchlist: (catalogItemId) =>
        set((s) => ({
          watchlist: s.watchlist.includes(catalogItemId)
            ? s.watchlist.filter((c) => c !== catalogItemId)
            : [...s.watchlist, catalogItemId],
        })),
      isWatchlisted: (catalogItemId) => get().watchlist.includes(catalogItemId),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // schemaVersion bumps go here as `migrate: (persisted, fromVersion) => ...`
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return defaultState();
        return persisted as PortfolioState;
      },
    }
  )
);
