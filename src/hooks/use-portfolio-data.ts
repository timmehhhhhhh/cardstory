"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { enrichHoldings, computeTotals } from "@/lib/portfolio/selectors";
import type { Holding, Portfolio } from "@/lib/portfolio/types";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";

const EMPTY_HOLDINGS: Holding[] = [];

/** Active portfolio's holdings, enriched with live catalog data + totals. */
export function usePortfolioData() {
  const portfolios = usePortfolioStore((s) => s.portfolios);
  const activePortfolioId = usePortfolioStore((s) => s.activePortfolioId);
  const active: Portfolio | undefined = portfolios.find((p) => p.id === activePortfolioId);
  const holdings = active?.holdings ?? EMPTY_HOLDINGS;

  const ids = React.useMemo(
    () => Array.from(new Set(holdings.map((h) => h.catalogItemId))),
    [holdings]
  );

  const query = useQuery<{ items: CatalogItemDetail[] }>({
    queryKey: ["catalog-by-ids", ids],
    queryFn: async () => {
      if (ids.length === 0) return { items: [] };
      const res = await fetch(`/api/catalog/by-ids?ids=${ids.join(",")}`);
      if (!res.ok) throw new Error("Failed to load catalog items");
      return res.json();
    },
  });

  const rows = React.useMemo(
    () => enrichHoldings(holdings, query.data?.items ?? []),
    [holdings, query.data]
  );
  const totals = React.useMemo(() => computeTotals(rows), [rows]);

  return {
    portfolios,
    activePortfolioId,
    activePortfolio: active,
    holdings,
    rows,
    totals,
    isLoading: query.isLoading && ids.length > 0,
  };
}
