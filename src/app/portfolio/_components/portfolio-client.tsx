"use client";

import * as React from "react";
import { usePortfolioData } from "@/hooks/use-portfolio-data";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { ValueHeader } from "@/app/portfolio/_components/value-header";
import { QuickActions } from "@/app/portfolio/_components/quick-actions";
import { MostValuable } from "@/app/portfolio/_components/most-valuable";
import { TrendingToday } from "@/app/portfolio/_components/trending-today";
import { CollectionsByGame } from "@/app/portfolio/_components/collections-by-game";
import { SmartFilters } from "@/app/portfolio/_components/smart-filters";
import { ItemGrid } from "@/app/portfolio/_components/item-grid";
import { BulkActionsBar } from "@/app/portfolio/_components/bulk-actions-bar";
import { DEFAULT_HOLDING_FILTERS, type HoldingFilters } from "@/app/portfolio/_components/types";
import { PublishShowcaseDialog } from "@/components/portfolio/publish-showcase-dialog";
import type { ShowcasePayload } from "@/lib/showcase/types";

export function PortfolioClient() {
  const { activePortfolioId, activePortfolio, rows, totals, isLoading } = usePortfolioData();
  const watchlist = usePortfolioStore((s) => s.watchlist);
  const currency = usePortfolioStore((s) => s.preferences.currency);

  const [filters, setFilters] = React.useState<HoldingFilters>(DEFAULT_HOLDING_FILTERS);
  const [bulkMode, setBulkMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  // Clear the selection when the active portfolio changes — adjusted during
  // render (not in an effect) per https://react.dev/learn/you-might-not-need-an-effect.
  const [prevActivePortfolioId, setPrevActivePortfolioId] = React.useState(activePortfolioId);
  if (activePortfolioId !== prevActivePortfolioId) {
    setPrevActivePortfolioId(activePortfolioId);
    setSelected(new Set());
  }

  const filteredRows = React.useMemo(() => {
    return rows.filter((r) => {
      if (filters.watchlistOnly && !watchlist.includes(r.catalogItemId)) return false;
      if (filters.gameId !== "all" && r.catalogItem?.gameId !== filters.gameId) return false;
      if (filters.productType !== "all" && r.catalogItem?.productType !== filters.productType) return false;
      if (filters.condition !== "all" && r.condition !== filters.condition) return false;
      if (filters.language !== "all" && r.language !== filters.language) return false;
      return true;
    });
  }, [rows, filters, watchlist]);

  function toggleSelect(holdingId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(holdingId)) next.delete(holdingId);
      else next.add(holdingId);
      return next;
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <ValueHeader rows={rows} totals={totals} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <QuickActions
          rows={filteredRows}
          bulkMode={bulkMode}
          onToggleBulkMode={() => {
            setBulkMode((v) => !v);
            setSelected(new Set());
          }}
        />
        <PublishShowcaseDialog
          portfolioId={activePortfolioId}
          portfolioName={activePortfolio?.name ?? "My Portfolio"}
          buildPayload={(): ShowcasePayload => ({
            portfolioName: activePortfolio?.name ?? "My Portfolio",
            currency,
            totalValue: totals.totalValue,
            totalGainLoss: totals.totalGainLoss,
            totalGainLossPct: totals.totalGainLossPct,
            itemCount: rows.length,
            items: rows.map((r) => ({
              catalogItemId: r.catalogItemId,
              gameId: r.catalogItem?.gameId ?? "",
              externalId: r.catalogItem?.externalId ?? "",
              name: r.catalogItem?.name ?? r.catalogItemId,
              imageSmallUrl: r.catalogItem?.imageSmallUrl ?? null,
              quantity: r.quantity,
              marketValue: r.marketValue,
            })),
          })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MostValuable rows={rows} />
        <TrendingToday rows={rows} />
        <CollectionsByGame rows={rows} />
      </div>

      <div className="flex flex-col gap-3">
        <SmartFilters filters={filters} onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))} />
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your collection…</p>
        ) : (
          <ItemGrid
            rows={filteredRows}
            bulkMode={bulkMode}
            selected={selected}
            onToggleSelect={toggleSelect}
            activePortfolioId={activePortfolioId}
          />
        )}
      </div>

      {bulkMode && (
        <BulkActionsBar
          activePortfolioId={activePortfolioId}
          selected={selected}
          onClear={() => setSelected(new Set())}
        />
      )}
    </div>
  );
}
