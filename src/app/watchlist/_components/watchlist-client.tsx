"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { useWatchlistData } from "@/hooks/use-watchlist-data";
import { WatchlistRow } from "@/app/watchlist/_components/watchlist-row";
import { WatchlistToolbar } from "@/app/watchlist/_components/watchlist-toolbar";
import { useWatchlistControls } from "@/app/watchlist/_components/use-watchlist-controls";
import { filterWatchlist, groupWatchlist, sortWatchlist } from "@/lib/watchlist/selectors";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
      <Star className="mb-2 size-6 text-muted-foreground" aria-hidden />
      <p className="font-medium">Nothing watched yet</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Tap the star on any card in Explore, Sets, or a card page to track its price here — no need to own it.
      </p>
    </div>
  );
}

function NoMatchesState() {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
      <p className="font-medium">No cards match these filters</p>
      <p className="max-w-xs text-sm text-muted-foreground">Try clearing a filter or two.</p>
    </div>
  );
}

export function WatchlistClient() {
  const { rows, isLoading } = useWatchlistData();
  const { filters, sort, group } = useWatchlistControls();

  const filtered = React.useMemo(() => filterWatchlist(rows, filters), [rows, filters]);
  const sorted = React.useMemo(() => sortWatchlist(filtered, sort), [filtered, sort]);
  const groups = React.useMemo(() => groupWatchlist(sorted, group), [sorted, group]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <p className="text-sm text-muted-foreground">
          Cards you&apos;re keeping an eye on, wherever they came from. Starring a card anywhere in the app adds it here.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your watchlist…</p>
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          <WatchlistToolbar rows={rows} />
          <span className="px-1 text-xs text-muted-foreground">
            {sorted.length} card{sorted.length === 1 ? "" : "s"}
            {sorted.length !== rows.length ? ` (of ${rows.length})` : ""}
          </span>
          {sorted.length === 0 ? (
            <NoMatchesState />
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map((g) => (
                <div key={g.key}>
                  {g.label && (
                    <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">
                      {g.label}{" "}
                      <span className="font-normal">
                        ({g.rows.length} card{g.rows.length === 1 ? "" : "s"})
                      </span>
                    </h2>
                  )}
                  <div className="flex flex-col gap-2">
                    {g.rows.map((row) => (
                      <WatchlistRow key={row.itemId} row={row} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
