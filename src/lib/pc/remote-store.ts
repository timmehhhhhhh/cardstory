"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { id } from "@/lib/pc/id";
import { usePCPreferencesStore } from "@/lib/pc/preferences-store";
import type { Holding, HoldingKind, NewHoldingInput, PC, PCState, WatchlistItem } from "@/lib/pc/types";
import { pcKind } from "@/lib/pc/types";
import type { LetGoDetails } from "@/lib/pc/api-schemas";

const QUERY_KEY = ["pc"] as const;
const WATCHLIST_QUERY_KEY = ["watchlist"] as const;

/**
 * Module-scoped (one per browser tab) in-flight guard for ensureBusinessPC.
 * Several independent call sites (business-holdings-panel, business-binder,
 * business-client, business-mode-toggle, and every CardTile's quick-add
 * handler) can each call ensureBusinessPC() in the same tick, before any of
 * them has had a chance to re-render with an updated `pcs` cache — without
 * this, each would independently see "no business PC yet" and create its
 * own duplicate. ensureBusinessPC's return type is a synchronous `string`
 * (callers use the id immediately, e.g. card-tile.tsx's quick-add), so this
 * can't be a shared in-flight Promise the way an async dedup guard normally
 * would be — instead it's the id of the optimistic PC the *first* caller in
 * a batch created, which every later caller in the same window reuses
 * instead of minting its own. Cleared once that request settles, by which
 * point the optimistic patch has already updated the query cache and the
 * `existing` lookup below will find it on its own. This only closes the
 * race within one tab; the server-side deterministic id + P2002 handling
 * (ensureBusinessPC in src/lib/pc/manage.ts) is what closes it across
 * tabs/devices.
 */
let businessPCPendingId: string | null = null;

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
 * User-facing message for each mutation's failure toast — deliberately
 * phrased around what the user just did (not the internal action name),
 * since "archiveHoldings failed" means nothing to someone who clicked
 * "Archive card". Falls back to a generic message for anything unlisted.
 */
const MUTATION_FAILURE_MESSAGES: Record<string, string> = {
  toggleWatchlist: "Couldn't update your watchlist.",
  createPC: "Couldn't create the PC.",
  ensureBusinessPC: "Couldn't set up your Business PC.",
  renamePC: "Couldn't rename the PC.",
  deletePC: "Couldn't delete the PC.",
  updateHolding: "Couldn't save your changes to that card.",
  archiveHoldings: "Couldn't archive that card — it's still in your PC.",
  removeHoldings: "Couldn't delete that card.",
  copyHoldings: "Couldn't copy that card.",
  moveHoldings: "Couldn't move that card.",
};

/**
 * Every optimistic mutation below reverts silently on failure (see
 * `reconcile` above) — without this, the UI just shows the change undoing
 * itself with no indication why, which reads as "the button doesn't work"
 * (see the PC Archives bug this was added for: a transient 500 during
 * archiveHoldings silently reverted the optimistic archive, so the card
 * just reappeared with zero explanation). Logging preserves the previous
 * console-only trace for debugging; the toast is what tells the *user*
 * something went wrong and their action didn't stick, so they know to retry
 * instead of assuming it worked.
 */
async function logMutationFailure(action: string, res: Response | null, err?: unknown) {
  const fallback = MUTATION_FAILURE_MESSAGES[action] ?? "Something went wrong — please try again.";

  if (err) {
    toast.error(fallback);
    console.error(`[pc] ${action} failed`, err);
    return;
  }
  if (res) {
    const body = await res.text().catch(() => "<unreadable body>");
    // Routes like the stale-session 401 or the "PC has archived cards" 409
    // (see route-errors.ts) return a specific, already user-facing `error`
    // message — prefer that over the generic fallback when present, since
    // it tells the user something actionable instead of just "try again".
    const specific = (() => {
      try {
        const parsed = JSON.parse(body) as { error?: unknown };
        return typeof parsed.error === "string" ? parsed.error : null;
      } catch {
        return null;
      }
    })();
    toast.error(specific ?? fallback);
    console.error(`[pc] ${action} failed`, { status: res.status, body });
  }
}

/**
 * Server-backed PC store for signed-in users — the only implementation
 * behind src/lib/pc/store.ts's pass-through, so consuming components
 * never called this directly.
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
 * state, not collection data, so they're read straight from
 * src/lib/pc/preferences-store.ts (a small localStorage-backed store) even
 * here. watchlist, unlike those, IS real account data (a signed-in user's
 * watchlist should follow them across devices), so it gets the same
 * query-cache-backed treatment as `pcs` below rather than delegating to the
 * preferences store.
 */
export function useRemotePCStore<T>(
  selector: (s: PCState) => T,
  opts: { enabled: boolean }
): T {
  const queryClient = useQueryClient();

  const { data: pcs = [], isError: pcsError } = useQuery({
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

  const preferences = usePCPreferencesStore((s) => s.preferences);
  const localActiveId = usePCPreferencesStore((s) => s.activePCId);
  const setLocalActivePC = usePCPreferencesStore((s) => s.setActivePC);
  const setCurrency = usePCPreferencesStore((s) => s.setCurrency);
  const setViewMode = usePCPreferencesStore((s) => s.setViewMode);
  const setSortField = usePCPreferencesStore((s) => s.setSortField);
  const setSortDirection = usePCPreferencesStore((s) => s.setSortDirection);
  const setGroupField = usePCPreferencesStore((s) => s.setGroupField);
  const setGroupDateGranularity = usePCPreferencesStore((s) => s.setGroupDateGranularity);
  const setLastUsedCostBasisCurrency = usePCPreferencesStore(
    (s) => s.setLastUsedCostBasisCurrency
  );
  const setDefaultCostBasisCurrency = usePCPreferencesStore(
    (s) => s.setDefaultCostBasisCurrency
  );
  const setBusinessMode = usePCPreferencesStore((s) => s.setBusinessMode);
  const setQuickAdd = usePCPreferencesStore((s) => s.setQuickAdd);
  const setHoldingFilters = usePCPreferencesStore((s) => s.setHoldingFilters);

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
      pcsError,
      watchlist,
      preferences,

      setCurrency,
      setViewMode,
      setSortField,
      setSortDirection,
      setGroupField,
      setGroupDateGranularity,
      setLastUsedCostBasisCurrency,
      setDefaultCostBasisCurrency,
      setBusinessMode,
      setQuickAdd,
      setHoldingFilters,
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
        // A sibling call already kicked off the find-or-create this tick
        // (see businessPCPendingId's doc comment) — reuse its id instead of
        // minting another.
        if (businessPCPendingId) return businessPCPendingId;
        const newId = id();
        businessPCPendingId = newId;
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
          })
          .finally(() => {
            if (businessPCPendingId === newId) businessPCPendingId = null;
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
      pcsError,
      watchlist,
      preferences,
      setCurrency,
      setViewMode,
      setSortField,
      setSortDirection,
      setGroupField,
      setGroupDateGranularity,
      setLastUsedCostBasisCurrency,
      setDefaultCostBasisCurrency,
      setBusinessMode,
      setQuickAdd,
      setHoldingFilters,
      setLocalActivePC,
      patch,
      reconcile,
      watchlistPatch,
      reconcileWatchlist,
    ]
  );

  return selector(state);
}
