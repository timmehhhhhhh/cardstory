"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { id, useLocalPortfolioStore, type PortfolioState } from "@/lib/portfolio/local-store";
import type { Holding, NewHoldingInput, Portfolio } from "@/lib/portfolio/types";

const QUERY_KEY = ["portfolio"] as const;

async function fetchPortfolios(): Promise<Portfolio[]> {
  const res = await fetch("/api/portfolio");
  if (!res.ok) throw new Error("Failed to load portfolios");
  const data = await res.json();
  return data.portfolios as Portfolio[];
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Server-backed portfolio store for signed-in users — same PortfolioState
 * shape as useLocalPortfolioStore so src/lib/portfolio/store.ts can switch
 * between the two without any consuming component knowing the difference.
 *
 * Portfolio/holding ids are still generated client-side (matching the
 * local store) so every action can keep a synchronous return signature —
 * some call sites (e.g. portfolio-selector.tsx) need a freshly-created
 * portfolio's id back immediately, before any network round trip.
 *
 * Mutations optimistically patch the React Query cache, fire the request,
 * and on failure invalidate the cache to refetch the server's actual state
 * (a reconcile, not a retry) — simple and correct at this app's data scale.
 *
 * preferences/watchlist/activePortfolioId are NOT server-backed — they're
 * per-browser UI state, not collection data, so they're read straight from
 * the local store even here (see the header comment on Portfolio/Holding
 * in prisma/schema.prisma for the same reasoning).
 */
export function useRemotePortfolioStore<T>(
  selector: (s: PortfolioState) => T,
  opts: { enabled: boolean }
): T {
  const queryClient = useQueryClient();

  const { data: portfolios = [] } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPortfolios,
    enabled: opts.enabled,
    staleTime: 30_000,
  });

  const preferences = useLocalPortfolioStore((s) => s.preferences);
  const watchlist = useLocalPortfolioStore((s) => s.watchlist);
  const localActiveId = useLocalPortfolioStore((s) => s.activePortfolioId);
  const setLocalActivePortfolio = useLocalPortfolioStore((s) => s.setActivePortfolio);
  const setCurrency = useLocalPortfolioStore((s) => s.setCurrency);
  const setViewMode = useLocalPortfolioStore((s) => s.setViewMode);
  const toggleWatchlist = useLocalPortfolioStore((s) => s.toggleWatchlist);
  const isWatchlisted = useLocalPortfolioStore((s) => s.isWatchlisted);

  // The locally-remembered "active portfolio" may not exist in the server
  // list yet (first login, or it was deleted from another device) — fall
  // back to the first remote portfolio and remember that choice locally.
  const activePortfolioId = React.useMemo(() => {
    if (portfolios.some((p) => p.id === localActiveId)) return localActiveId;
    return portfolios[0]?.id ?? localActiveId;
  }, [portfolios, localActiveId]);

  React.useEffect(() => {
    if (activePortfolioId && activePortfolioId !== localActiveId) {
      setLocalActivePortfolio(activePortfolioId);
    }
  }, [activePortfolioId, localActiveId, setLocalActivePortfolio]);

  const patch = React.useCallback(
    (updater: (portfolios: Portfolio[]) => Portfolio[]) => {
      queryClient.setQueryData<Portfolio[]>(QUERY_KEY, (old) => updater(old ?? []));
    },
    [queryClient]
  );

  // Used both to roll back a failed optimistic update and, for transfers,
  // to reconcile client-generated ids with the server-assigned ids the
  // copy/move actually got — either way it's "refetch the source of truth."
  const reconcile = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  const state: PortfolioState = React.useMemo(
    () => ({
      schemaVersion: 1,
      activePortfolioId: activePortfolioId ?? localActiveId,
      portfolios,
      watchlist,
      preferences,

      setCurrency,
      setViewMode,
      setActivePortfolio: setLocalActivePortfolio,
      toggleWatchlist,
      isWatchlisted,

      createPortfolio: (name: string) => {
        const newId = id();
        const p: Portfolio = { id: newId, name, createdAt: nowIso(), holdings: [] };
        patch((ps) => [...ps, p]);
        fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: newId, name }),
        })
          .then((res) => {
            if (!res.ok) reconcile();
          })
          .catch(reconcile);
        return newId;
      },

      renamePortfolio: (portfolioId: string, name: string) => {
        patch((ps) => ps.map((p) => (p.id === portfolioId ? { ...p, name } : p)));
        fetch(`/api/portfolio/${portfolioId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })
          .then((res) => {
            if (!res.ok) reconcile();
          })
          .catch(reconcile);
      },

      deletePortfolio: (portfolioId: string) => {
        patch((ps) => ps.filter((p) => p.id !== portfolioId));
        fetch(`/api/portfolio/${portfolioId}`, { method: "DELETE" })
          .then((res) => {
            if (!res.ok) reconcile();
          })
          .catch(reconcile);
      },

      addHolding: (portfolioId: string, input: NewHoldingInput) => {
        const newId = id();
        const holding: Holding = { ...input, id: newId, createdAt: nowIso(), updatedAt: nowIso() };
        patch((ps) =>
          ps.map((p) => (p.id === portfolioId ? { ...p, holdings: [...p.holdings, holding] } : p))
        );
        fetch(`/api/portfolio/${portfolioId}/holdings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, id: newId }),
        })
          .then((res) => {
            if (!res.ok) reconcile();
          })
          .catch(reconcile);
        return newId;
      },

      updateHolding: (portfolioId: string, holdingId: string, holdingPatch: Partial<Omit<Holding, "id">>) => {
        patch((ps) =>
          ps.map((p) =>
            p.id !== portfolioId
              ? p
              : {
                  ...p,
                  holdings: p.holdings.map((h) =>
                    h.id === holdingId ? { ...h, ...holdingPatch, updatedAt: nowIso() } : h
                  ),
                }
          )
        );
        fetch(`/api/portfolio/holdings/${holdingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(holdingPatch),
        })
          .then((res) => {
            if (!res.ok) reconcile();
          })
          .catch(reconcile);
      },

      removeHoldings: (portfolioId: string, holdingIds: string[]) => {
        patch((ps) =>
          ps.map((p) =>
            p.id === portfolioId
              ? { ...p, holdings: p.holdings.filter((h) => !holdingIds.includes(h.id)) }
              : p
          )
        );
        fetch(`/api/portfolio/${portfolioId}/holdings`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holdingIds }),
        })
          .then((res) => {
            if (!res.ok) reconcile();
          })
          .catch(reconcile);
      },

      copyHoldings: (fromId: string, toId: string, holdingIds: string[]) => {
        patch((ps) => {
          const from = ps.find((p) => p.id === fromId);
          if (!from) return ps;
          const toCopy = from.holdings
            .filter((h) => holdingIds.includes(h.id))
            .map((h) => ({ ...h, id: id(), createdAt: nowIso(), updatedAt: nowIso() }));
          return ps.map((p) => (p.id === toId ? { ...p, holdings: [...p.holdings, ...toCopy] } : p));
        });
        // Always reconcile once the request settles, success or failure:
        // the copies get fresh server-assigned ids either way, so the
        // optimistic client-generated ids can never be the final state.
        fetch("/api/portfolio/holdings/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromId, toId, holdingIds, mode: "copy" }),
        })
          .catch(() => {})
          .finally(reconcile);
      },

      moveHoldings: (fromId: string, toId: string, holdingIds: string[]) => {
        patch((ps) => {
          const from = ps.find((p) => p.id === fromId);
          if (!from) return ps;
          const toMove = from.holdings.filter((h) => holdingIds.includes(h.id));
          return ps.map((p) => {
            if (p.id === fromId) return { ...p, holdings: p.holdings.filter((h) => !holdingIds.includes(h.id)) };
            if (p.id === toId) return { ...p, holdings: [...p.holdings, ...toMove] };
            return p;
          });
        });
        // Same reasoning as copyHoldings above — the moved holding also
        // gets a new server-assigned id, so always reconcile on settle.
        fetch("/api/portfolio/holdings/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromId, toId, holdingIds, mode: "move" }),
        })
          .catch(() => {})
          .finally(reconcile);
      },
    }),
    [
      activePortfolioId,
      localActiveId,
      portfolios,
      watchlist,
      preferences,
      setCurrency,
      setViewMode,
      setLocalActivePortfolio,
      toggleWatchlist,
      isWatchlisted,
      patch,
      reconcile,
    ]
  );

  return selector(state);
}
