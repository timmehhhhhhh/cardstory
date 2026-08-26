"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SavedView, ViewFilters } from "@/lib/views/types";

const QUERY_KEY = ["views"] as const;

function id(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

async function fetchViews(): Promise<SavedView[]> {
  const res = await fetch("/api/views");
  if (!res.ok) throw new Error("Failed to load views");
  const data = (await res.json()) as { views: SavedView[] };
  return data.views;
}

/**
 * Views is account-only (no guest/localStorage mode, same as PC — see
 * src/lib/pc/store.ts), so there's no local/remote split to switch between:
 * this is just React Query wrapping /api/views directly. Mutations
 * optimistically patch the query cache, fire the request, and invalidate
 * to reconcile with the server on failure — same idiom as
 * src/lib/pc/remote-store.ts, minus the local-store half.
 */
export function useViewsQuery(opts: { enabled: boolean } = { enabled: true }) {
  return useQuery({ queryKey: QUERY_KEY, queryFn: fetchViews, staleTime: 30_000, enabled: opts.enabled });
}

export function useViewsMutations() {
  const queryClient = useQueryClient();

  const patch = React.useCallback(
    (updater: (views: SavedView[]) => SavedView[]) => {
      queryClient.setQueryData<SavedView[]>(QUERY_KEY, (old) => updater(old ?? []));
    },
    [queryClient]
  );
  const reconcile = React.useCallback(
    () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    [queryClient]
  );

  const createView = React.useCallback(
    (name: string, filters: ViewFilters) => {
      const newId = id();
      const now = nowIso();
      const optimistic: SavedView = { id: newId, name, filters, createdAt: now, updatedAt: now };
      patch((views) => [...views, optimistic]);
      fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newId, name, filters }),
      })
        .then((res) => {
          if (!res.ok) reconcile();
        })
        .catch(reconcile);
      return newId;
    },
    [patch, reconcile]
  );

  const renameView = React.useCallback(
    (viewId: string, name: string) => {
      patch((views) => views.map((v) => (v.id === viewId ? { ...v, name } : v)));
      fetch(`/api/views/${viewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
        .then((res) => {
          if (!res.ok) reconcile();
        })
        .catch(reconcile);
    },
    [patch, reconcile]
  );

  const updateViewFilters = React.useCallback(
    (viewId: string, filters: ViewFilters) => {
      patch((views) => views.map((v) => (v.id === viewId ? { ...v, filters } : v)));
      fetch(`/api/views/${viewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      })
        .then((res) => {
          if (!res.ok) reconcile();
        })
        .catch(reconcile);
    },
    [patch, reconcile]
  );

  const deleteView = React.useCallback(
    (viewId: string) => {
      patch((views) => views.filter((v) => v.id !== viewId));
      fetch(`/api/views/${viewId}`, { method: "DELETE" })
        .then((res) => {
          if (!res.ok) reconcile();
        })
        .catch(reconcile);
    },
    [patch, reconcile]
  );

  return { createView, renameView, updateViewFilters, deleteView };
}
