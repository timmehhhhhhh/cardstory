"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { WatchlistSortDropdown } from "@/app/watchlist/_components/watchlist-sort-dropdown";
import { WatchlistGroupSelect } from "@/app/watchlist/_components/watchlist-group-select";
import { WatchlistFilterPanel } from "@/app/watchlist/_components/watchlist-filter-panel";
import { useWatchlistControls } from "@/app/watchlist/_components/use-watchlist-controls";
import {
  computeWatchlistFacets,
  watchlistFiltersActive,
  type EnrichedWatchlistItem,
} from "@/lib/watchlist/selectors";

/**
 * Watchlist's filter/sort/group toolbar — brings it to the same level of
 * capability as Explore's SidebarFilters + SortDropdown
 * (src/app/explore/_components), plus a user-selectable group-by (Explore
 * itself has no grouping concept — see WatchlistGroupSelect's doc comment).
 *
 * Applied client-side over `rows` (the already-fully-fetched watchlist,
 * from useWatchlistData) rather than routing through Explore's
 * `/api/catalog/search`: Watchlist is a small, bounded, already-loaded list,
 * so a fresh paginated server search per filter change would be slower and
 * pull in machinery (pagination, DB-wide facet queries) this page doesn't
 * need — see use-watchlist-controls.ts and lib/watchlist/selectors.ts's
 * filterWatchlist/sortWatchlist/groupWatchlist for the client-side
 * equivalents, built on the same comparators (lib/catalog/compare.ts)
 * Explore's server search uses.
 */
export function WatchlistToolbar({ rows }: { rows: EnrichedWatchlistItem[] }) {
  const { filters, sort, group, updateFilters, updateSort, updateGroup, clearFilters } =
    useWatchlistControls();
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const facets = React.useMemo(() => computeWatchlistFacets(rows), [rows]);

  const [qDraft, setQDraft] = React.useState(filters.q);
  const [prevQ, setPrevQ] = React.useState(filters.q);
  if (filters.q !== prevQ) {
    setPrevQ(filters.q);
    setQDraft(filters.q);
  }
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (qDraft !== filters.q) updateFilters({ q: qDraft });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  const active = watchlistFiltersActive(filters);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-40 flex-1 basis-40">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          placeholder="Search your watchlist…"
          className="bg-surface border-border pl-8 pr-8"
        />
        {qDraft && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQDraft("");
              updateFilters({ q: "" });
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <SlidersHorizontal className="size-3.5" /> Filters
            {active && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-primary" />}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 overflow-y-auto bg-background border-border">
          <SheetTitle className="px-4 pt-4">Filters</SheetTitle>
          <div className="space-y-4 px-4 pb-6">
            {active && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear all filters
              </button>
            )}
            <WatchlistFilterPanel filters={filters} onChange={updateFilters} facets={facets} />
          </div>
        </SheetContent>
      </Sheet>

      <WatchlistGroupSelect field={group} onFieldChange={updateGroup} />
      <WatchlistSortDropdown value={sort} onChange={updateSort} />
    </div>
  );
}
