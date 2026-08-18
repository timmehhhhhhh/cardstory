"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useShortlistStore } from "@/lib/shortlist/store";
import { computeShortlistTotals, enrichShortlist } from "@/lib/shortlist/selectors";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";
import type { SportsCardItemDetail } from "@/lib/sportscards/manage";

/**
 * The shortlist, enriched with live catalog data + per-currency totals —
 * the shortlist's counterpart to usePCData.
 *
 * The two by-ids query keys are deliberately identical to usePCData's, so a
 * card that sits in both a PC and the shortlist is fetched once and shared.
 */
export function useShortlistData() {
  const items = useShortlistStore((s) => s.items);

  const catalogIds = React.useMemo(
    () =>
      Array.from(
        new Set(items.filter((i) => i.kind === "tcg" && i.catalogItemId).map((i) => i.catalogItemId!))
      ),
    [items]
  );
  const sportsIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          items.filter((i) => i.kind === "sports" && i.sportsCardItemId).map((i) => i.sportsCardItemId!)
        )
      ),
    [items]
  );

  const catalogQuery = useQuery<{ items: CatalogItemDetail[] }>({
    queryKey: ["catalog-by-ids", catalogIds],
    queryFn: async () => {
      if (catalogIds.length === 0) return { items: [] };
      const res = await fetch(`/api/catalog/by-ids?ids=${catalogIds.join(",")}`);
      if (!res.ok) throw new Error("Failed to load catalog items");
      return res.json();
    },
  });

  const sportsQuery = useQuery<{ items: SportsCardItemDetail[] }>({
    queryKey: ["sportscards-by-ids", sportsIds],
    queryFn: async () => {
      if (sportsIds.length === 0) return { items: [] };
      const res = await fetch(`/api/sportscards/by-ids?ids=${sportsIds.join(",")}`);
      if (!res.ok) throw new Error("Failed to load sports card items");
      return res.json();
    },
  });

  const rows = React.useMemo(
    () => enrichShortlist(items, catalogQuery.data?.items ?? [], sportsQuery.data?.items ?? []),
    [items, catalogQuery.data, sportsQuery.data]
  );
  const totals = React.useMemo(() => computeShortlistTotals(rows), [rows]);

  return {
    items,
    rows,
    totals,
    isLoading:
      (catalogQuery.isLoading && catalogIds.length > 0) || (sportsQuery.isLoading && sportsIds.length > 0),
  };
}
