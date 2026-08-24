"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { usePCStore } from "@/lib/pc/store";
import { enrichWatchlist } from "@/lib/watchlist/selectors";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";
import type { SportsCardItemDetail } from "@/lib/sportscards/manage";

/**
 * The watchlist, enriched with live catalog data — the watchlist's
 * counterpart to usePCData/useShortlistData. Reuses the exact same
 * by-ids query keys as those two hooks, so a card that's also held or
 * shortlisted is fetched once and shared across all three.
 */
export function useWatchlistData() {
  const watchlist = usePCStore((s) => s.watchlist);

  const catalogIds = React.useMemo(
    () => Array.from(new Set(watchlist.filter((w) => w.kind === "tcg").map((w) => w.itemId))),
    [watchlist]
  );
  const sportsIds = React.useMemo(
    () => Array.from(new Set(watchlist.filter((w) => w.kind === "sports").map((w) => w.itemId))),
    [watchlist]
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
    () => enrichWatchlist(watchlist, catalogQuery.data?.items ?? [], sportsQuery.data?.items ?? []),
    [watchlist, catalogQuery.data, sportsQuery.data]
  );

  return {
    watchlist,
    rows,
    isLoading:
      (catalogQuery.isLoading && catalogIds.length > 0) || (sportsQuery.isLoading && sportsIds.length > 0),
  };
}
