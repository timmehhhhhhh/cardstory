"use client";

import { CheckSquare, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnrichedHolding } from "@/lib/pc/selectors";
import type {
  GroupDateGranularity,
  GroupField,
  HoldingFilters,
  SortDirection,
  SortField,
} from "@/lib/pc/types";
import { SortBySelect } from "@/app/pc/_components/sort-by";
import { GroupBySelect } from "@/app/pc/_components/group-by";
import { SmartFilters } from "@/app/pc/_components/smart-filters";
import { ViewModeToggle } from "@/app/pc/_components/view-mode-toggle";

function exportCsv(rows: EnrichedHolding[]) {
  const header = [
    "Name",
    "Details",
    "Game/Sport",
    "Serial",
    "Quantity",
    "Condition",
    "Grade",
    "Raw Condition",
    "Language",
    "Cost Basis (USD)",
    "Price at Acquisition (USD)",
    "Market Value (USD)",
    "Gain/Loss (USD)",
    "Acquired",
  ];
  const lines = rows.map((r) =>
    [
      r.display.name,
      r.display.subtitle,
      r.display.groupLabel,
      r.serialNumber ?? "",
      r.quantity,
      r.condition,
      r.condition === "graded" ? `${r.gradeCompany ?? ""} ${r.gradeValue ?? ""}`.trim() : "",
      r.condition === "raw" ? (r.rawCondition ?? "") : "",
      r.language,
      r.costBasisTotalUsd.toFixed(2),
      r.priceAtAcquisitionTotal != null ? r.priceAtAcquisitionTotal.toFixed(2) : "",
      r.marketValue.toFixed(2),
      r.gainLoss.toFixed(2),
      r.acquiredAt ? r.acquiredAt.slice(0, 10) : "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cardstory-pc-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Every PC-area option/setting/filter lives in this one bordered section —
 * sort, view mode, bulk actions, export, and the full filter set (game/
 * sport/card name/type/condition/language/watchlist/promo/date-added).
 * Previously these were split across QuickActions (sticky, above the
 * dashboard cards) and a second SmartFilters+ViewModeToggle row further
 * down the page — consolidated here so there's one place to look, not two.
 * See src/app/pc/_components/pc-client.tsx.
 */
export function PCToolbar({
  rows,
  bulkMode,
  onToggleBulkMode,
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
  groupField,
  onGroupFieldChange,
  groupDateGranularity,
  onGroupDateGranularityChange,
  filters,
  onFiltersChange,
}: {
  rows: EnrichedHolding[];
  bulkMode: boolean;
  onToggleBulkMode: () => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortFieldChange: (field: SortField) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
  groupField: GroupField;
  onGroupFieldChange: (field: GroupField) => void;
  groupDateGranularity: GroupDateGranularity;
  onGroupDateGranularityChange: (granularity: GroupDateGranularity) => void;
  filters: HoldingFilters;
  onFiltersChange: (patch: Partial<HoldingFilters>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3">
      {/* Sticky action row: stays reachable while scrolling a long
          collection — everything below it scrolls away normally. */}
      <div className="sticky top-14 md:top-0 z-30 flex flex-wrap items-center gap-2 bg-surface/95 py-0.5 backdrop-blur supports-backdrop-blur:bg-surface/60">
        <SortBySelect
          field={sortField}
          direction={sortDirection}
          onFieldChange={onSortFieldChange}
          onDirectionChange={onSortDirectionChange}
        />
        <GroupBySelect
          field={groupField}
          onFieldChange={onGroupFieldChange}
          dateGranularity={groupDateGranularity}
          onDateGranularityChange={onGroupDateGranularityChange}
        />
        <ViewModeToggle />
        <button
          type="button"
          role="switch"
          aria-checked={bulkMode}
          onClick={onToggleBulkMode}
          title="When on, select multiple cards to copy, move, or archive them together"
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            bulkMode
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:text-foreground"
          )}
        >
          <CheckSquare className="size-3.5" />
          Bulk Actions
          <span
            className={cn(
              "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              bulkMode ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            {bulkMode ? "On" : "Off"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => exportCsv(rows)}
          disabled={rows.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-elevated hover:text-foreground disabled:opacity-40"
        >
          <Download className="size-4" /> Export
        </button>
      </div>

      <SmartFilters filters={filters} onChange={onFiltersChange} />
    </div>
  );
}
