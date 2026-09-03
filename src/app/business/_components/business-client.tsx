"use client";

import * as React from "react";
import Link from "next/link";
import { Archive, BookOpen } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePCData } from "@/hooks/use-pc-data";
import { usePCStore } from "@/lib/pc/store";
import { DEFAULT_HOLDING_FILTERS, pcKind, type HoldingFilters } from "@/lib/pc/types";
import { ValueHeader } from "@/app/pc/_components/value-header";
import { QuickActions } from "@/app/pc/_components/quick-actions";
import { MostValuable } from "@/app/pc/_components/most-valuable";
import { TrendingToday } from "@/app/pc/_components/trending-today";
import { CollectionsByGame } from "@/app/pc/_components/collections-by-game";
import { SmartFilters } from "@/app/pc/_components/smart-filters";
import { HoldingsList } from "@/app/pc/_components/holdings-list";
import { ViewModeToggle } from "@/app/pc/_components/view-mode-toggle";
import { BulkActionsBar } from "@/app/pc/_components/bulk-actions-bar";
import { sortHoldings } from "@/lib/pc/selectors";
import { matchesNameNumberQuery } from "@/lib/utils/name-match";
import { PublishShowcaseDialog } from "@/components/pc/publish-showcase-dialog";
import { AddSportsCardDialog } from "@/components/sportscards/add-sports-card-dialog";
import { Button } from "@/components/ui/button";
import type { ShowcasePayload } from "@/lib/showcase/types";

/**
 * Business Inventory's own dashboard — a Business-scoped sibling of
 * PCClient. Deliberately does NOT touch the globally active pc
 * (activePCId): it resolves the singleton "Business Inventory" pc via
 * ensureBusinessPC and passes that id straight into usePCData, so viewing
 * this tab never disturbs whatever pc is active on /pc. See
 * BusinessModeToggle (src/app/explore/_components) for how new holdings
 * get routed here from Explore.
 */
export function BusinessClient() {
  const { data: session, status } = useSession();
  const pcs = usePCStore((s) => s.pcs);
  const ensureBusinessPC = usePCStore((s) => s.ensureBusinessPC);
  const businessPC = pcs.find((p) => pcKind(p) === "business");
  // ensureBusinessPC find-or-creates — only actually mutates the store the
  // first time a vendor ever lands here, when no business pc exists yet.
  React.useEffect(() => {
    if (!businessPC) ensureBusinessPC();
  }, [businessPC, ensureBusinessPC]);
  const businessPCId = businessPC?.id;

  const { activePC, rows, totals, isLoading } = usePCData(businessPCId);
  const watchlist = usePCStore((s) => s.watchlist);
  const currency = usePCStore((s) => s.preferences.currency);
  const viewMode = usePCStore((s) => s.preferences.viewMode);
  const sortField = usePCStore((s) => s.preferences.sortField);
  const sortDirection = usePCStore((s) => s.preferences.sortDirection);
  const setSortField = usePCStore((s) => s.setSortField);
  const setSortDirection = usePCStore((s) => s.setSortDirection);
  const groupField = usePCStore((s) => s.preferences.groupField);
  const setGroupField = usePCStore((s) => s.setGroupField);
  const groupDateGranularity = usePCStore((s) => s.preferences.groupDateGranularity);
  const setGroupDateGranularity = usePCStore((s) => s.setGroupDateGranularity);

  const [filters, setFilters] = React.useState<HoldingFilters>(DEFAULT_HOLDING_FILTERS);
  const [bulkMode, setBulkMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

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

  if (status !== "loading" && !session?.user?.isVendor) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-12 text-center sm:px-6">
        <p className="text-sm text-muted-foreground">
          Business Inventory is a vendor feature. Turn on Vendor from your account menu to use it.
        </p>
      </div>
    );
  }

  if (!businessPCId) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-12 text-center sm:px-6">
        <p className="text-sm text-muted-foreground">Loading Business Inventory…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <ValueHeader rows={rows} totals={totals} showSelector={false} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <QuickActions
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
            groupDateGranularity={groupDateGranularity}
            onGroupDateGranularityChange={setGroupDateGranularity}
          />
          <AddSportsCardDialog />
          <Button asChild variant="outline" size="sm">
            <Link href="/business/binder">
              <BookOpen className="size-4" />
              Binder
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/business/archives">
              <Archive className="size-4" />
              Archives
            </Link>
          </Button>
        </div>
        <PublishShowcaseDialog
          pcId={businessPCId}
          pcName={activePC?.name ?? "Business Inventory"}
          buildPayload={(): ShowcasePayload => ({
            pcName: activePC?.name ?? "Business Inventory",
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
          <p className="text-sm text-muted-foreground">Loading your inventory…</p>
        ) : (
          <HoldingsList
            rows={sortedRows}
            groupField={groupField}
            groupDateGranularity={groupDateGranularity}
            sortDirection={sortDirection}
            viewMode={viewMode}
            bulkMode={bulkMode}
            selected={selected}
            onToggleSelect={toggleSelect}
            activePCId={businessPCId}
            sourceLabel="Business Inventory"
          />
        )}
      </div>

      {bulkMode && (
        <BulkActionsBar activePCId={businessPCId} selected={selected} onClear={() => setSelected(new Set())} />
      )}
    </div>
  );
}
