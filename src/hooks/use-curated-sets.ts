"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CuratedSet, CuratedSetFilters } from "@/lib/curated-sets/types";

const QUERY_KEY = ["curated-sets"] as const;

function id(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

async function fetchCuratedSets(): Promise<CuratedSet[]> {
  const res = await fetch("/api/curated-sets");
  if (!res.ok) throw new Error("Failed to load curated sets");
  const data = (await res.json()) as { curatedSets: CuratedSet[] };
  return data.curatedSets;
}

/**
 * Curated Sets is account-only, same as Views (src/hooks/use-views.ts) —
 * this is React Query wrapping /api/curated-sets directly, no local/guest
 * store split. Mutations optimistically patch the query cache, fire the
 * request, and invalidate to reconcile with the server on failure — same
 * idiom as use-views.ts.
 */
export function useCuratedSetsQuery(opts: { enabled: boolean } = { enabled: true }) {
  return useQuery({ queryKey: QUERY_KEY, queryFn: fetchCuratedSets, staleTime: 30_000, enabled: opts.enabled });
}

export function useCuratedSetsMutations() {
  const queryClient = useQueryClient();

  const patch = React.useCallback(
    (updater: (sets: CuratedSet[]) => CuratedSet[]) => {
      queryClient.setQueryData<CuratedSet[]>(QUERY_KEY, (old) => updater(old ?? []));
    },
    [queryClient]
  );
  const reconcile = React.useCallback(
    () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    [queryClient]
  );

  const createCuratedSet = React.useCallback(
    (name: string, filters: CuratedSetFilters, targetQuantity: number) => {
      const newId = id();
      const now = nowIso();
      const optimistic: CuratedSet = { id: newId, name, filters, targetQuantity, createdAt: now, updatedAt: now };
      patch((sets) => [...sets, optimistic]);
      fetch("/api/curated-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newId, name, filters, targetQuantity }),
      })
        .then((res) => {
          if (!res.ok) reconcile();
        })
        .catch(reconcile);
      return newId;
    },
    [patch, reconcile]
  );

  const updateCuratedSet = React.useCallback(
    (curatedSetId: string, update: { name?: string; filters?: CuratedSetFilters; targetQuantity?: number }) => {
      patch((sets) => sets.map((s) => (s.id === curatedSetId ? { ...s, ...update } : s)));
      fetch(`/api/curated-sets/${curatedSetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      })
        .then((res) => {
          if (!res.ok) reconcile();
        })
        .catch(reconcile);
    },
    [patch, reconcile]
  );

  const deleteCuratedSet = React.useCallback(
    (curatedSetId: string) => {
      patch((sets) => sets.filter((s) => s.id !== curatedSetId));
      fetch(`/api/curated-sets/${curatedSetId}`, { method: "DELETE" })
        .then((res) => {
          if (!res.ok) reconcile();
        })
        .catch(reconcile);
    },
    [patch, reconcile]
  );

  return { createCuratedSet, updateCuratedSet, deleteCuratedSet };
}
