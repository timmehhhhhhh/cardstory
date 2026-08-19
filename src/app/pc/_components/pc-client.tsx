"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { usePCData } from "@/hooks/use-pc-data";
import { usePCStore } from "@/lib/pc/store";
import { pcKind } from "@/lib/pc/types";
import { ValueHeader } from "@/app/pc/_components/value-header";
import { QuickActions } from "@/app/pc/_components/quick-actions";
import { MostValuable } from "@/app/pc/_components/most-valuable";
import { TrendingToday } from "@/app/pc/_components/trending-today";
import { CollectionsByGame } from "@/app/pc/_components/collections-by-game";
import { SmartFilters } from "@/app/pc/_components/smart-filters";
import { ItemGrid } from "@/app/pc/_components/item-grid";
import { ItemGallery } from "@/app/pc/_components/item-gallery";
import { ViewModeToggle } from "@/app/pc/_components/view-mode-toggle";
import { BulkActionsBar } from "@/app/pc/_components/bulk-actions-bar";
import { DEFAULT_HOLDING_FILTERS, type HoldingFilters } from "@/app/pc/_components/types";
import { PublishShowcaseDialog } from "@/components/pc/publish-showcase-dialog";
import { AddSportsCardDialog } from "@/components/sportscards/add-sports-card-dialog";
import { Button } from "@/components/ui/button";
import type { ShowcasePayload } from "@/lib/showcase/types";

export function PCClient() {
  const { pcs, activePCId, activePC, rows, totals, isLoading } = usePCData();
  const watchlist = usePCStore((s) => s.watchlist);
  const currency = usePCStore((s) => s.preferences.currency);
  const viewMode = usePCStore((s) => s.preferences.viewMode);
  const setActivePC = usePCStore((s) => s.setActivePC);

  // Business Inventory now lives on its own /business tab and is filtered
  // out of PCSelector — if a vendor's activePCId is still pointed at it
  // (left over from before that tab existed), redirect once to their
  // first personal pc rather than showing a pc that PCSelector can no
  // longer represent.
  React.useEffect(() => {
    if (activePC && pcKind(activePC) === "business") {
      const firstPersonal = pcs.find((p) => pcKind(p) !== "business");
      if (firstPersonal) setActivePC(firstPersonal.id);
    }
  }, [activePC, pcs, setActivePC]);

  const [filters, setFilters] = React.useState<HoldingFilters>(DEFAULT_HOLDING_FILTERS);
  const [bulkMode, setBulkMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  // Clear the selection when the active pc changes — adjusted during
  // render (not in an effect) per https://react.dev/learn/you-might-not-need-an-effect.
  const [prevActivePCId, setPrevActivePCId] = React.useState(activePCId);
  if (activePCId !== prevActivePCId) {
    setPrevActivePCId(activePCId);
    setSelected(new Set());
  }

  // Set of watched item ids — checked against catalogItemId OR
  // sportsCardItemId, since watchlist entries can now be either kind (a
  // catalogItemId-only check previously excluded sports holdings entirely).
  const watchedIds = React.useMemo(() => new Set(watchlist.map((w) => w.itemId)), [watchlist]);

  const filteredRows = React.useMemo(() => {
    const playerQuery = filters.player.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.watchlistOnly && !watchedIds.has(r.catalogItemId ?? r.sportsCardItemId ?? "")) return false;
      if (filters.gameId !== "all" && r.catalogItem?.gameId !== filters.gameId) return false;
      if (filters.sport !== "all" && r.sportsCardItem?.sport !== filters.sport) return false;
      if (playerQuery && !r.sportsCardItem?.playerName?.toLowerCase().includes(playerQuery)) return false;
      if (filters.productType !== "all" && r.catalogItem?.productType !== filters.productType) return false;
      if (filters.condition !== "all" && r.condition !== filters.condition) return false;
      if (filters.language !== "all" && r.language !== filters.language) return false;
      if (filters.promoOnly && r.catalogItem?.rarity !== "Promo") return false;
      return true;
    });
  }, [rows, filters, watchedIds]);

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
        <div className="flex flex-wrap items-center gap-2">
          <QuickActions
            rows={filteredRows}
            bulkMode={bulkMode}
            onToggleBulkMode={() => {
              setBulkMode((v) => !v);
              setSelected(new Set());
            }}
          />
          <AddSportsCardDialog />
          <Button asChild variant="outline" size="sm">
            <Link href="/binder">
              <BookOpen className="size-4" />
              Binder
            </Link>
          </Button>
        </div>
        <PublishShowcaseDialog
          pcId={activePCId}
          pcName={activePC?.name ?? "My PC"}
          buildPayload={(): ShowcasePayload => ({
            pcName: activePC?.name ?? "My PC",
            currency,
            totalValue: totals.totalValue,
            totalGainLoss: totals.totalGainLoss,
            totalGainLossPct: totals.totalGainLossPct,
            itemCount: rows.length,
            // Showcase only covers TCG cards for now — sports cards aren't
            // part of the shared catalog ShowcasePayload's items reference.
            items: rows
              .filter((r): r is typeof r & { catalogItem: NonNullable<typeof r.catalogItem> } => !!r.catalogItem)
              .map((r) => ({
                catalogItemId: r.catalogItemId!,
                gameId: r.catalogItem.gameId,
                externalId: r.catalogItem.externalId,
                name: r.catalogItem.name,
                number: r.catalogItem.number,
                imageSmallUrl: r.catalogItem.imageSmallUrl,
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SmartFilters filters={filters} onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))} />
          <ViewModeToggle />
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your collection…</p>
        ) : viewMode === "grid" ? (
          <ItemGallery
            rows={filteredRows}
            bulkMode={bulkMode}
            selected={selected}
            onToggleSelect={toggleSelect}
            activePCId={activePCId}
          />
        ) : (
          <ItemGrid
            rows={filteredRows}
            bulkMode={bulkMode}
            selected={selected}
            onToggleSelect={toggleSelect}
            activePCId={activePCId}
          />
        )}
      </div>

      {bulkMode && (
        <BulkActionsBar
          activePCId={activePCId}
          selected={selected}
          onClear={() => setSelected(new Set())}
        />
      )}
    </div>
  );
}
