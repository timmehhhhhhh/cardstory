"use client";

import * as React from "react";
import Link from "next/link";
import { Archive, BookOpen } from "lucide-react";
import { usePCData } from "@/hooks/use-pc-data";
import { usePCStore } from "@/lib/pc/store";
import { pcKind } from "@/lib/pc/types";
import { ValueHeader } from "@/app/pc/_components/value-header";
import { PCToolbar } from "@/app/pc/_components/pc-toolbar";
import { MostValuable } from "@/app/pc/_components/most-valuable";
import { TrendingToday } from "@/app/pc/_components/trending-today";
import { CollectionsByGame } from "@/app/pc/_components/collections-by-game";
import { HoldingsList } from "@/app/pc/_components/holdings-list";
import { BulkActionsBar } from "@/app/pc/_components/bulk-actions-bar";
import { sortHoldings } from "@/lib/pc/selectors";
import { matchesNameNumberQuery } from "@/lib/utils/name-match";
import { PublishShowcaseDialog } from "@/components/pc/publish-showcase-dialog";
import { Button } from "@/components/ui/button";
import type { ShowcasePayload } from "@/lib/showcase/types";

export function PCClient() {
  const { pcs, activePCId, activePC, rows, totals, isLoading } = usePCData();
  const watchlist = usePCStore((s) => s.watchlist);
  const currency = usePCStore((s) => s.preferences.currency);
  const viewMode = usePCStore((s) => s.preferences.viewMode);
  const sortField = usePCStore((s) => s.preferences.sortField);
  const sortDirection = usePCStore((s) => s.preferences.sortDirection);
  const setSortField = usePCStore((s) => s.setSortField);
  const setSortDirection = usePCStore((s) => s.setSortDirection);
  const groupField = usePCStore((s) => s.preferences.groupField);
  const setGroupField = usePCStore((s) => s.setGroupField);
  const setActivePC = usePCStore((s) => s.setActivePC);
  const filters = usePCStore((s) => s.preferences.holdingFilters);
  const setHoldingFilters = usePCStore((s) => s.setHoldingFilters);

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
    return rows.filter((r) => {
      if (filters.watchlistOnly && !watchedIds.has(r.catalogItemId ?? r.sportsCardItemId ?? "")) return false;
      if (filters.gameId !== "all" && r.catalogItem?.gameId !== filters.gameId) return false;
      if (filters.sport !== "all" && r.sportsCardItem?.sport !== filters.sport) return false;
      if (
        filters.cardName.trim() &&
        !matchesNameNumberQuery(filters.cardName, {
          name: r.display.name,
          nameEn: r.display.nameEn,
          number: r.display.number,
          setName: r.display.setName,
          setNameEn: r.display.setNameEn,
          setCode: r.display.setCode,
          nationalPokedexNumbers: r.display.nationalPokedexNumbers,
        })
      )
        return false;
      if (filters.productType !== "all" && r.catalogItem?.productType !== filters.productType) return false;
      if (filters.condition !== "all" && r.condition !== filters.condition) return false;
      if (filters.language !== "all" && r.language !== filters.language) return false;
      if (filters.promoOnly && r.catalogItem?.rarity !== "Promo") return false;
      if (filters.dateAddedFrom && r.createdAt.slice(0, 10) < filters.dateAddedFrom) return false;
      if (filters.dateAddedTo && r.createdAt.slice(0, 10) > filters.dateAddedTo) return false;
      return true;
    });
  }, [rows, filters, watchedIds]);

  const sortedRows = React.useMemo(
    () => sortHoldings(filteredRows, sortField, sortDirection),
    [filteredRows, sortField, sortDirection]
  );

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

      <PCToolbar
        rows={filteredRows}
        bulkMode={bulkMode}
        onToggleBulkMode={() => {
          setBulkMode((v) => !v);
          setSelected(new Set());
        }}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortFieldChange={setSortField}
        onSortDirectionChange={setSortDirection}
        groupField={groupField}
        onGroupFieldChange={setGroupField}
        filters={filters}
        onFiltersChange={(patch) => setHoldingFilters({ ...filters, ...patch })}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/binder">
              <BookOpen className="size-4" />
              Binder
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/pc/archives">
              <Archive className="size-4" />
              Archives
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
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your collection…</p>
        ) : (
          <HoldingsList
            rows={sortedRows}
            groupField={groupField}
            viewMode={viewMode}
            bulkMode={bulkMode}
            selected={selected}
            onToggleSelect={toggleSelect}
            activePCId={activePCId}
            sourceLabel={`PC · ${activePC?.name ?? "My PC"}`}
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
