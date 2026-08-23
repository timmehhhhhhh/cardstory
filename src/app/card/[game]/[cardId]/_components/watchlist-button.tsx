"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { usePCStore } from "@/lib/pc/store";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/**
 * Watchlist star for the card detail page header — same trigger/state shape
 * as card-tile.tsx's watchlistTrigger (used on Explore), just standalone
 * instead of one of several stacked icon buttons on a tile.
 */
export function WatchlistButton({
  catalogItemId,
  sportsCardItemId,
  priceRaw,
}: {
  catalogItemId?: string;
  sportsCardItemId?: string;
  priceRaw: number | null;
}) {
  const itemId = (catalogItemId ?? sportsCardItemId)!;
  const currency = usePCStore((s) => s.preferences.currency);
  const watchlistEntry = usePCStore((s) => s.watchlist.find((w) => w.itemId === itemId));
  const watchlisted = !!watchlistEntry;
  const toggleWatchlist = usePCStore((s) => s.toggleWatchlist);
  // Brief error pulse when toggleWatchlist's request fails — see
  // card-tile.tsx's watchlistTrigger for the same pattern/reasoning.
  const [watchlistFailed, setWatchlistFailed] = React.useState(false);

  const title = watchlistFailed
    ? "Couldn't update watchlist — try again"
    : watchlisted
      ? `Watching since ${new Date(watchlistEntry!.addedAt).toLocaleDateString()}${
          watchlistEntry!.priceAtAdd != null ? ` · ${formatMoney(watchlistEntry!.priceAtAdd, currency)} at add` : ""
        }`
      : undefined;

  return (
    <button
      type="button"
      aria-label={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={watchlisted}
      title={title}
      onClick={() => {
        void toggleWatchlist(itemId, catalogItemId ? "tcg" : "sports", priceRaw).then((ok) => {
          if (!ok) {
            setWatchlistFailed(true);
            setTimeout(() => setWatchlistFailed(false), 1500);
          }
        });
      }}
      className="flex flex-none items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-watchlist"
    >
      <Star
        className={cn(
          "size-4",
          watchlistFailed ? "text-negative" : watchlisted && "fill-watchlist text-watchlist"
        )}
      />
      {watchlisted ? "Watching" : "Watch"}
    </button>
  );
}
