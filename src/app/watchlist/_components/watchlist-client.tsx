"use client";

import { Star } from "lucide-react";
import { useWatchlistData } from "@/hooks/use-watchlist-data";
import { WatchlistRow } from "@/app/watchlist/_components/watchlist-row";

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

export function WatchlistClient() {
  const { rows, isLoading } = useWatchlistData();

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
        <div className="flex flex-col gap-2">
          <span className="px-1 text-xs text-muted-foreground">
            {rows.length} card{rows.length === 1 ? "" : "s"}
          </span>
          {rows.map((row) => (
            <WatchlistRow key={row.itemId} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
