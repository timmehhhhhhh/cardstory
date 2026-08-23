"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { id, useLocalPCStore, type PCState } from "@/lib/pc/local-store";
import type { Holding, HoldingKind, NewHoldingInput, PC, WatchlistItem } from "@/lib/pc/types";
import { pcKind } from "@/lib/pc/types";
import type { LetGoDetails } from "@/lib/pc/api-schemas";

const QUERY_KEY = ["pc"] as const;
const WATCHLIST_QUERY_KEY = ["watchlist"] as const;

async function fetchPCs(): Promise<PC[]> {
  const res = await fetch("/api/pc");
  if (!res.ok) throw new Error("Failed to load pcs");
  const data = (await res.json()) as { pcs: PC[] };
  return data.pcs;
}

async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const res = await fetch("/api/watchlist");
  if (!res.ok) throw new Error("Failed to load watchlist");
  const data = (await res.json()) as { entries: WatchlistItem[] };
  return data.entries;
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Every optimistic mutation below reverts silently on failure (see
 * `reconcile` above) — the UI just shows the change undoing itself with no
 * indication why. Logging here at least makes a failed request visible in
 * the browser console instead of leaving zero trace anywhere.
 */
async function logMutationFailure(action: string, res: Response | null, err?: unknown) {
  if (err) {
    console.error(`[pc] ${action} failed`, err);
    return;
  }
  if (res) {
    const body = await res.text().catch(() => "<unreadable body>");
    console.error(`[pc] ${action} failed`, { status: res.status, body });
  }
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

  const { data: watchlist = [] } = useQuery({
    queryKey: WATCHLIST_QUERY_KEY,
    queryFn: fetchWatchlist,
    enabled: opts.enabled,
    staleTime: 30_000,
  });

  const preferences = useLocalPCStore((s) => s.preferences);
  const localActiveId = useLocalPCStore((s) => s.activePCId);
  const setLocalActivePC = useLocalPCStore((s) => s.setActivePC);
  const setCurrency = useLocalPCStore((s) => s.setCurrency);
  const setViewMode = useLocalPCStore((s) => s.setViewMode);
  const setLastUsedCostBasisCurrency = useLocalPCStore(
    (s) => s.setLastUsedCostBasisCurrency
  );
  const setBusinessMode = useLocalPCStore((s) => s.setBusinessMode);
  const setQuickAdd = useLocalPCStore((s) => s.setQuickAdd);

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

  const watchlistPatch = React.useCallback(
    (updater: (w: WatchlistItem[]) => WatchlistItem[]) => {
      queryClient.setQueryData<WatchlistItem[]>(WATCHLIST_QUERY_KEY, (old) => updater(old ?? []));
    },
    [queryClient]
  );

  const reconcileWatchlist = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEY });
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
      setQuickAdd,
      setActivePC: setLocalActivePC,

      toggleWatchlist: (itemId: string, kind: HoldingKind, priceAtAdd: number | null) => {
        const exists = watchlist.some((w) => w.itemId === itemId);
        watchlistPatch((w) =>
          exists
            ? w.filter((x) => x.itemId !== itemId)
            : [...w, { itemId, kind, addedAt: nowIso(), priceAtAdd }]
        );
        (exists
          ? fetch("/api/watchlist", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId }),
            })
          : fetch("/api/watchlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId, kind, priceAtAdd }),
            })
        )
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("toggleWatchlist", res);
              reconcileWatchlist();
            }
          })
          .catch((err) => {
            logMutationFailure("toggleWatchlist", null, err);
            reconcileWatchlist();
          });
      },
      isWatchlisted: (itemId: string) => watchlist.some((w) => w.itemId === itemId),

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
            if (!res.ok) {
              logMutationFailure("createPC", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("createPC", null, err);
            reconcile();
          });
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
            if (!res.ok) {
              logMutationFailure("ensureBusinessPC", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("ensureBusinessPC", null, err);
            reconcile();
          });
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
            if (!res.ok) {
              logMutationFailure("renamePC", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("renamePC", null, err);
            reconcile();
          });
      },

      deletePC: (pcId: string) => {
        patch((ps) => ps.filter((p) => p.id !== pcId));
        fetch(`/api/pc/${pcId}`, { method: "DELETE" })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("deletePC", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("deletePC", null, err);
            reconcile();
          });
      },

      addHolding: (pcId: string, input: NewHoldingInput) => {
        const newId = id();
        const holding: Holding = { ...input, id: newId, createdAt: nowIso(), updatedAt: nowIso() };
        patch((ps) =>
          ps.map((p) => (p.id === pcId ? { ...p, holdings: [...p.holdings, holding] } : p))
        );
        // Unlike the other mutations here, the caller needs to know
        // whether this actually landed — see AddHoldingDialog, which
        // keeps its dialog open and shows an error instead of quietly
        // closing on a card that was only ever added optimistically.
        // A failed request still reconciles (rolls the optimistic add
        // back out of the cache) exactly as before; it now also rejects
        // so that rollback isn't the only trace of the failure.
        return fetch(`/api/pc/${pcId}/holdings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, id: newId }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("Failed to add card to PC");
            return newId;
          })
          .catch((err) => {
            reconcile();
            throw err instanceof Error ? err : new Error("Failed to add card to PC");
          });
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
            if (!res.ok) {
              logMutationFailure("updateHolding", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("updateHolding", null, err);
            reconcile();
          });
      },

      archiveHoldings: (pcId: string, holdingIds: string[], letGo?: LetGoDetails) => {
        const letGoAt = letGo?.letGoAt ?? nowIso();
        patch((ps) =>
          ps.map((p) =>
            p.id !== pcId
              ? p
              : {
                  ...p,
                  holdings: p.holdings.map((h) =>
                    holdingIds.includes(h.id)
                      ? {
                          ...h,
                          archivedAt: nowIso(),
                          letGoAt,
                          letGoMethod: letGo?.letGoMethod,
                          letGoTo: letGo?.letGoTo,
                          letGoAmount: letGo?.letGoAmount ?? undefined,
                          letGoCurrency: letGo?.letGoCurrency,
                          letGoNotes: letGo?.letGoNotes,
                          updatedAt: nowIso(),
                        }
                      : h
                  ),
                }
          )
        );
        fetch("/api/pc/holdings/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pcId, holdingIds, letGo }),
        })
          .then((res) => {
            if (!res.ok) {
              logMutationFailure("archiveHoldings", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("archiveHoldings", null, err);
            reconcile();
          });
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
            if (!res.ok) {
              logMutationFailure("removeHoldings", res);
              reconcile();
            }
          })
          .catch((err) => {
            logMutationFailure("removeHoldings", null, err);
            reconcile();
          });
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
          .then((res) => {
            if (!res.ok) logMutationFailure("copyHoldings", res);
          })
          .catch((err) => logMutationFailure("copyHoldings", null, err))
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
          .then((res) => {
            if (!res.ok) logMutationFailure("moveHoldings", res);
          })
          .catch((err) => logMutationFailure("moveHoldings", null, err))
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
      setQuickAdd,
      setLocalActivePC,
      patch,
      reconcile,
      watchlistPatch,
      reconcileWatchlist,
    ]
  );

  return selector(state);
}
