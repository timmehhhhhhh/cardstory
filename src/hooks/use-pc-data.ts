"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { usePCStore } from "@/lib/pc/store";
import { enrichHoldings, computeTotals } from "@/lib/pc/selectors";
import { holdingKind, type Holding, type PC } from "@/lib/pc/types";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";
import type { SportsCardItemDetail } from "@/lib/sportscards/manage";

const EMPTY_HOLDINGS: Holding[] = [];

/**
 * Active pc's holdings, enriched with live catalog data + totals.
 *
 * Pass `pcIdOverride` to scope this to a specific pc regardless of which
 * one is globally "active" — e.g. the Business Inventory page, which reads
 * the business pc's data without disturbing whatever's active on /pc.
 */
export function usePCData(pcIdOverride?: string) {
  const pcs = usePCStore((s) => s.pcs);
  const globalActivePCId = usePCStore((s) => s.activePCId);
  const activePCId = pcIdOverride ?? globalActivePCId;
  const active: PC | undefined = pcs.find((p) => p.id === activePCId);
  // Archived holdings (see PC Archives / Business Archives) stay in the
  // same pc.holdings array they've always been in — never removed, never
  // moved — so every active-collection view just filters them back out
  // here rather than each dashboard/list needing to know about archiving.
  const holdings = React.useMemo(
    () => (active?.holdings ?? EMPTY_HOLDINGS).filter((h) => !h.archivedAt),
    [active?.holdings]
  );

  const catalogIds = React.useMemo(
    () =>
      Array.from(
        new Set(holdings.filter((h) => holdingKind(h) === "tcg" && h.catalogItemId).map((h) => h.catalogItemId!))
      ),
    [holdings]
  );
  const sportsIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          holdings.filter((h) => holdingKind(h) === "sports" && h.sportsCardItemId).map((h) => h.sportsCardItemId!)
        )
      ),
    [holdings]
  );

  const catalogQuery = useQuery<{ items: CatalogItemDetail[] }>({
    queryKey: ["catalog-by-ids", catalogIds],
    queryFn: async () => {
      if (catalogIds.length === 0) return { items: [] };
      const res = await fetch(`/api/catalog/by-ids?ids=${catalogIds.join(",")}`);
      if (!res.ok) throw new Error("Failed to load catalog items");
      return res.json();
    },
    // Deleting the last holding of a given card shrinks `catalogIds`, which
    // is itself the query key — that's a key React Query has never fetched,
    // so without this it'd go briefly `undefined`/loading and collapse the
    // whole list (and the page's scroll position with it). Keep the
    // previous items on screen while the shorter id set refetches instead.
    placeholderData: keepPreviousData,
  });

  const sportsQuery = useQuery<{ items: SportsCardItemDetail[] }>({
    queryKey: ["sportscards-by-ids", sportsIds],
    queryFn: async () => {
      if (sportsIds.length === 0) return { items: [] };
      const res = await fetch(`/api/sportscards/by-ids?ids=${sportsIds.join(",")}`);
      if (!res.ok) throw new Error("Failed to load sports card items");
      return res.json();
    },
    // See catalogQuery above.
    placeholderData: keepPreviousData,
  });

  const rows = React.useMemo(
    () => enrichHoldings(holdings, catalogQuery.data?.items ?? [], sportsQuery.data?.items ?? []),
    [holdings, catalogQuery.data, sportsQuery.data]
  );
  const totals = React.useMemo(() => computeTotals(rows), [rows]);

  return {
    pcs,
    activePCId,
    activePC: active,
    holdings,
    rows,
    totals,
    isLoading: (catalogQuery.isLoading && catalogIds.length > 0) || (sportsQuery.isLoading && sportsIds.length > 0),
  };
}
