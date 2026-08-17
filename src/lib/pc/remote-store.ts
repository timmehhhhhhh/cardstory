"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { id, useLocalPCStore, type PCState } from "@/lib/pc/local-store";
import type { Holding, HoldingKind, NewHoldingInput, PC, WatchlistItem } from "@/lib/pc/types";
import { pcKind } from "@/lib/pc/types";

const QUERY_KEY = ["pc"] as const;
const WATCHLIST_QUERY_KEY = ["watchlist"] as const;

async function fetchPCs(): Promise<PC[]> {
  const res = await fetch("/api/pc");
  if (!res.ok) throw new Error("Failed to load pcs");
  const data = await res.json();
  return data.pcs as PC[];
}

async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const res = await fetch("/api/watchlist");
  if (!res.ok) throw new Error("Failed to load watchlist");
  const data = await res.json();
  return data.entries as WatchlistItem[];
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Server-backed PC store for signed-in users — same PCState
 * shape as useLocalPCStore so src/lib/pc/store.ts can switch
 * between the two without any consuming component knowing the difference.
 *
 * PC/holding ids are still generated client-side (matching the
 * local store) so every action can keep a synchronous return signature —
 * some call sites (e.g. pc-selector.tsx) need a freshly-created
 * PC's id back immediately, before any network round trip.
 *
 * Mutations optimistically patch the React Query cache, fire the request,
 * and on failure invalidate the cache to refetch the server's actual state
 * (a reconcile, not a retry) — simple and correct at this app's data scale.
 *
 * preferences/activePCId are NOT server-backed — they're per-browser UI
 * state, not collection data, so they're read straight from the local store
 * even here. watchlist, unlike those, IS real account data (a signed-in
 * user's watchlist should follow them across devices), so it gets the same
 * query-cache-backed treatment as `pcs` below rather than delegating to the
 * local store.
 */
export function useRemotePCStore<T>(
  selector: (s: PCState) => T,
  opts: { enabled: boolean }
): T {
  const queryClient = useQueryClient();

  const { data: pcs = [] } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPCs,
    enabled: opts.enabled,
    staleTime: 30_000,
  });

  const preferences = useLocalPCStore((s) => s.preferences);
  const watchlist = useLocalPCStore((s) => s.watchlist);
  const localActiveId = useLocalPCStore((s) => s.activePCId);
  const setLocalActivePC = useLocalPCStore((s) => s.setActivePC);
  const setCurrency = useLocalPCStore((s) => s.setCurrency);
  const setViewMode = useLocalPCStore((s) => s.setViewMode);
  const setLastUsedCostBasisCurrency = useLocalPCStore(
    (s) => s.setLastUsedCostBasisCurrency
  );
  const setBusinessMode = useLocalPCStore((s) => s.setBusinessMode);
  const toggleWatchlist = useLocalPCStore((s) => s.toggleWatchlist);
  const isWatchlisted = useLocalPCStore((s) => s.isWatchlisted);

  // The locally-remembered "active PC" may not exist in the server
  // list yet (first login, or it was deleted from another device) — fall
  // back to the first remote PC and remember that choice locally.
  const activePCId = React.useMemo(() => {
    if (pcs.some((p) => p.id === localActiveId)) return localActiveId;
    return pcs[0]?.id ?? localActiveId;
  }, [pcs, localActiveId]);

  React.useEffect(() => {
    if (activePCId && activePCId !== localActiveId) {
      setLocalActivePC(activePCId);
    }
  }, [activePCId, localActiveId, setLocalActivePC]);

  const patch = React.useCallback(
    (updater: (pcs: PC[]) => PC[]) => {
      queryClient.setQueryData<PC[]>(QUERY_KEY, (old) => updater(old ?? []));
    },
    [queryClient]
  );

  // Used both to roll back a failed optimistic update and, for transfers,
  // to reconcile client-generated ids with the server-assigned ids the
  // copy/move actually got — either way it's "refetch the source of truth."
  const reconcile = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  const state: PCState = React.useMemo(
    () => ({
      schemaVersion: 1,
      activePCId: activePCId ?? localActiveId,
      pcs,
      watchlist,
      preferences,

      setCurrency,
      setViewMode,
      setLastUsedCostBasisCurrency,
      setBusinessMode,
      setActivePC: setLocalActivePC,
      toggleWatchlist,
      isWatchlisted,

      createPC: (name: string) => {
        const newId = id();
        const p: PC = { id: newId, name, createdAt: nowIso(), holdings: [] };
        patch((ps) => [...ps, p]);
        fetch("/api/pc", {
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

      ensureBusinessPC: () => {
        const existing = pcs.find((p) => pcKind(p) === "business");
        if (existing) return existing.id;
        const newId = id();
        const p: PC = {
          id: newId,
          name: "Business Inventory",
          kind: "business",
          createdAt: nowIso(),
          holdings: [],
        };
        patch((ps) => [...ps, p]);
        fetch("/api/pc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: newId, name: p.name, kind: "business" }),
        })
          .then((res) => {
            if (!res.ok) reconcile();
          })
          .catch(reconcile);
        return newId;
      },

      renamePC: (pcId: string, name: string) => {
        patch((ps) => ps.map((p) => (p.id === pcId ? { ...p, name } : p)));
        fetch(`/api/pc/${pcId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })
          .then((res) => {
            if (!res.ok) reconcile();
          })
          .catch(reconcile);
      },

      deletePC: (pcId: string) => {
        patch((ps) => ps.filter((p) => p.id !== pcId));
        fetch(`/api/pc/${pcId}`, { method: "DELETE" })
          .then((res) => {
            if (!res.ok) reconcile();
          })
          .catch(reconcile);
      },

      addHolding: (pcId: string, input: NewHoldingInput) => {
        const newId = id();
        const holding: Holding = { ...input, id: newId, createdAt: nowIso(), updatedAt: nowIso() };
        patch((ps) =>
          ps.map((p) => (p.id === pcId ? { ...p, holdings: [...p.holdings, holding] } : p))
        );
        fetch(`/api/pc/${pcId}/holdings`, {
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

      updateHolding: (pcId: string, holdingId: string, holdingPatch: Partial<Omit<Holding, "id">>) => {
        patch((ps) =>
          ps.map((p) =>
            p.id !== pcId
              ? p
              : {
                  ...p,
                  holdings: p.holdings.map((h) =>
                    h.id === holdingId ? { ...h, ...holdingPatch, updatedAt: nowIso() } : h
                  ),
                }
          )
        );
        fetch(`/api/pc/holdings/${holdingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(holdingPatch),
        })
          .then((res) => {
            if (!res.ok) reconcile();
          })
          .catch(reconcile);
      },

      removeHoldings: (pcId: string, holdingIds: string[]) => {
        patch((ps) =>
          ps.map((p) =>
            p.id === pcId
              ? { ...p, holdings: p.holdings.filter((h) => !holdingIds.includes(h.id)) }
              : p
          )
        );
        fetch(`/api/pc/${pcId}/holdings`, {
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
        fetch("/api/pc/holdings/transfer", {
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
        fetch("/api/pc/holdings/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromId, toId, holdingIds, mode: "move" }),
        })
          .catch(() => {})
          .finally(reconcile);
      },
    }),
    [
      activePCId,
      localActiveId,
      pcs,
      watchlist,
      preferences,
      setCurrency,
      setViewMode,
      setLastUsedCostBasisCurrency,
      setBusinessMode,
      setLocalActivePC,
      toggleWatchlist,
      isWatchlisted,
      patch,
      reconcile,
    ]
  );

  return selector(state);
}
