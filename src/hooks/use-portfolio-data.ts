"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { enrichHoldings, computeTotals } from "@/lib/portfolio/selectors";
import { holdingKind, type Holding, type Portfolio } from "@/lib/portfolio/types";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";
import type { SportsCardItemDetail } from "@/lib/sportscards/manage";

const EMPTY_HOLDINGS: Holding[] = [];

/** Active portfolio's holdings, enriched with live catalog data + totals. */
export function usePortfolioData() {
  const portfolios = usePortfolioStore((s) => s.portfolios);
  const activePortfolioId = usePortfolioStore((s) => s.activePortfolioId);
  const active: Portfolio | undefined = portfolios.find((p) => p.id === activePortfolioId);
  const holdings = active?.holdings ?? EMPTY_HOLDINGS;

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
    () => enrichHoldings(holdings, catalogQuery.data?.items ?? [], sportsQuery.data?.items ?? []),
    [holdings, catalogQuery.data, sportsQuery.data]
  );
  const totals = React.useMemo(() => computeTotals(rows), [rows]);

  return {
    portfolios,
    activePortfolioId,
    activePortfolio: active,
    holdings,
    rows,
    totals,
    isLoading: (catalogQuery.isLoading && catalogIds.length > 0) || (sportsQuery.isLoading && sportsIds.length > 0),
  };
}
