"use client";

import { groupRows } from "@/lib/pc/selectors";
import type { EnrichedHolding } from "@/lib/pc/selectors";
import type { GroupField, ViewMode } from "@/lib/pc/types";
import { ItemGrid } from "@/app/pc/_components/item-grid";
import { ItemGallery } from "@/app/pc/_components/item-gallery";
import { EmptyHoldings } from "@/app/pc/_components/empty-holdings";

/**
 * The PC List/Gallery body — grid or gallery per ViewMode, optionally
 * sectioned into labeled groups per GroupField (see groupRows in
 * src/lib/pc/selectors.ts). Shared by pc-client.tsx and business-client.tsx
 * so the two don't each reimplement the grouping/view-mode branching.
 */
export function HoldingsList({
  rows,
  groupField,
  viewMode,
  bulkMode,
  selected,
  onToggleSelect,
  activePCId,
  sourceLabel,
}: {
  rows: EnrichedHolding[];
  groupField: GroupField;
  viewMode: ViewMode;
  bulkMode: boolean;
  selected: Set<string>;
  onToggleSelect: (holdingId: string) => void;
  activePCId: string;
  /** Where a shortlist add from this list should be recorded as coming from — e.g. "PC · My Collection" or "Business Inventory". */
  sourceLabel: string;
}) {
  if (rows.length === 0) return <EmptyHoldings />;

  const groups = groupRows(rows, groupField);
  const List = viewMode === "grid" ? ItemGallery : ItemGrid;

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2.5">
          {group.label && (
            <h3 className="text-sm font-semibold text-muted-foreground">
              {group.label} <span className="font-normal">· {group.rows.length}</span>
            </h3>
          )}
          <List
            rows={group.rows}
            bulkMode={bulkMode}
            selected={selected}
            onToggleSelect={onToggleSelect}
            activePCId={activePCId}
            sourceLabel={sourceLabel}
          />
        </div>
      ))}
    </div>
  );
}
