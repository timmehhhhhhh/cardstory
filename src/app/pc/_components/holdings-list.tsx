"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
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
 *
 * Each labeled group can be individually collapsed (a click on its header),
 * and a "Collapse All Groups" pill appears in a sticky pane once the user
 * has scrolled past the top of the groups area — kept self-contained here
 * (rather than lifted into pc-client.tsx/business-client.tsx) since this is
 * the one place both pages already share.
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
  // Which group keys are collapsed — group.key is only unique within one
  // groupField's output (see groupRows), so this is reset whenever
  // groupField or activePCId changes rather than allowed to carry a stale
  // key across a different grouping/collection. Adjusted during render
  // (not a useEffect) per https://react.dev/learn/you-might-not-need-an-effect,
  // same idiom pc-client.tsx uses to reset its own selection.
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const resetKey = `${groupField}:${activePCId}`;
  const [prevResetKey, setPrevResetKey] = React.useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setCollapsed(new Set());
  }

  // Sticky "Collapse All Groups" pane only appears once the groups area's
  // top edge has scrolled out of view — tracked via a zero-height sentinel
  // placed right before the groups list, rather than being sticky from
  // page load like PCToolbar's own row.
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const [pastGroupsTop, setPastGroupsTop] = React.useState(false);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setPastGroupsTop(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (rows.length === 0) return <EmptyHoldings />;

  const groups = groupRows(rows, groupField);
  const collapsibleGroups = groups.filter((g) => !!g.label);
  const allCollapsed = collapsibleGroups.length > 0 && collapsibleGroups.every((g) => collapsed.has(g.key));

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllGroups() {
    setCollapsed(allCollapsed ? new Set() : new Set(collapsibleGroups.map((g) => g.key)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div ref={sentinelRef} />

      {pastGroupsTop && collapsibleGroups.length > 0 && (
        // top-24 clears PCToolbar's own always-sticky top-14 row on /pc
        // (roughly 40px tall including padding) with margin to spare; on
        // /business, which has no equivalent sticky row above this list,
        // it just reads as a slightly larger gap under the global nav —
        // this component doesn't know which page it's on, so one offset
        // has to work for both. On md: and up the global nav is a left
        // sidebar (no fixed header), so PCToolbar's row sticks at top-0
        // instead of top-14 — md:top-10 preserves the same ~40px
        // clearance below it without the header's 56px. z-20 keeps it
        // behind PCToolbar's z-30 row if the two ever overlap during a
        // fast scroll.
        <div className="sticky top-24 md:top-10 z-20 -mt-4 flex justify-end">
          <button
            type="button"
            role="switch"
            aria-checked={allCollapsed}
            onClick={toggleAllGroups}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface/95 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur hover:text-foreground supports-backdrop-blur:bg-surface/60"
          >
            {allCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {allCollapsed ? "Expand All Groups" : "Collapse All Groups"}
          </button>
        </div>
      )}

      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.key);
        return (
          <div key={group.key} className="flex flex-col gap-2.5">
            {group.label && (
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={!isCollapsed}
                className="flex items-center gap-1.5 text-left text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className={cn("size-4 shrink-0 transition-transform", !isCollapsed && "rotate-90")} />
                {group.label} <span className="font-normal">· {group.rows.length}</span>
              </button>
            )}
            {(!group.label || !isCollapsed) &&
              (viewMode === "list" ? (
                <ItemGrid
                  rows={group.rows}
                  bulkMode={bulkMode}
                  selected={selected}
                  onToggleSelect={onToggleSelect}
                  activePCId={activePCId}
                  sourceLabel={sourceLabel}
                />
              ) : (
                <ItemGallery
                  rows={group.rows}
                  bulkMode={bulkMode}
                  selected={selected}
                  onToggleSelect={onToggleSelect}
                  activePCId={activePCId}
                  sourceLabel={sourceLabel}
                  dense={viewMode === "grid3"}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}
