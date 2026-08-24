"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { id } from "@/lib/pc/id";
import type { NewShortlistItemInput, ShortlistItem } from "@/lib/shortlist/types";
import type { ShortlistState } from "@/lib/shortlist/local-store";

const QUERY_KEY = ["shortlist"] as const;

async function fetchShortlist(): Promise<ShortlistItem[]> {
  const res = await fetch("/api/shortlist");
  if (!res.ok) throw new Error("Failed to load shortlist");
  const data = (await res.json()) as { items: ShortlistItem[] };
  return data.items;
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Server-backed shortlist store for signed-in users — same ShortlistState
 * shape as useLocalShortlistStore so src/lib/shortlist/store.ts can switch
 * between the two without any consuming component knowing the difference.
 * A direct transcription of the watchlist half of src/lib/pc/remote-store.ts:
 * ids are still client-generated, mutations optimistically patch the query
 * cache, fire the request, and reconcile (invalidate + refetch) on failure.
 */
export function useRemoteShortlistStore<T>(
  selector: (s: ShortlistState) => T,
  opts: { enabled: boolean }
): T {
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchShortlist,
    enabled: opts.enabled,
    staleTime: 30_000,
  });

  const patch = React.useCallback(
    (updater: (items: ShortlistItem[]) => ShortlistItem[]) => {
      queryClient.setQueryData<ShortlistItem[]>(QUERY_KEY, (old) => updater(old ?? []));
    },
    [queryClient]
  );

  const reconcile = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  const state: ShortlistState = React.useMemo(
    () => ({
      schemaVersion: 1,
      items,

      addShortlistItem: (input: NewShortlistItemInput) => {
        const newId = id();
        const item: ShortlistItem = { ...input, id: newId, addedAt: nowIso(), updatedAt: nowIso() };
        patch((xs) => [item, ...xs]);
        fetch("/api/shortlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        })
          .then((res) => {
            if (!res.ok) reconcile();
          })
          .catch(reconcile);
        return newId;
      },

      updateShortlistItem: (itemId, patchInput) => {
        patch((xs) => xs.map((i) => (i.id === itemId ? { ...i, ...patchInput, updatedAt: nowIso() } : i)));
        fetch(`/api/shortlist/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchInput),
        })
          .then((res) => {
            if (!res.ok) reconcile();
          })
          .catch(reconcile);
      },

      removeShortlistItems: (itemIds) => {
        patch((xs) => xs.filter((i) => !itemIds.includes(i.id)));
        fetch("/api/shortlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemIds }),
        })
          .then((res) => {
            if (!res.ok) reconcile();
          })
          .catch(reconcile);
      },

      // Deliberately no server counterpart: nothing in this feature ever
      // needs to wipe a signed-in user's whole shortlist server-side today
      // (checkout removes just the bought rows), so this only ever runs
      // against the local store. Kept on the interface so both stores stay
      // structurally identical.
      clearShortlist: () => {
        patch(() => []);
      },
    }),
    [items, patch, reconcile]
  );

  return selector(state);
}
