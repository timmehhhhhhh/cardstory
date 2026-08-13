"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { GameBadge } from "@/components/cards/game-badge";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { formatMoney, formatPct } from "@/lib/utils/format";
import type { CatalogSearchItem } from "@/lib/catalog/search";

export function CardTile({
  item,
  view = "grid",
}: {
  item: CatalogSearchItem;
  view?: "grid" | "list";
}) {
  const currency = usePortfolioStore((s) => s.preferences.currency);
  const watchlisted = usePortfolioStore((s) => s.watchlist.includes(item.id));
  const toggleWatchlist = usePortfolioStore((s) => s.toggleWatchlist);

  const href = `/card/${item.gameId}/${encodeURIComponent(item.externalId)}`;
  const positive = (item.priceChangePct ?? 0) >= 0;

  if (view === "list") {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 transition-colors hover:bg-surface-elevated"
      >
        <div className="relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
          {item.imageSmallUrl && (
            <Image
            src={item.imageSmallUrl}
            alt=""
            fill
            sizes="40px"
            unoptimized
            className="object-contain"
          />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.setName}
            {item.number ? ` · ${item.number}` : ""}
          </p>
        </div>
        <GameBadge gameId={item.gameId} className="hidden sm:inline-flex" />
        <div className="w-24 flex-none text-right">
          <p className="num-tabular text-sm font-semibold">{formatMoney(item.priceRaw, currency)}</p>
          {item.priceChangePct != null && (
            <p className={cn("num-tabular text-xs", positive ? "text-positive" : "text-negative")}>
              {formatPct(item.priceChangePct)}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
          aria-pressed={watchlisted}
          onClick={(e) => {
            e.preventDefault();
            toggleWatchlist(item.id);
          }}
          className="flex-none rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-watchlist"
        >
          <Star className={cn("size-4", watchlisted && "fill-watchlist text-watchlist")} />
        </button>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary/40 hover:bg-surface-elevated"
    >
      <div className="relative aspect-[5/7] w-full bg-muted">
        {item.imageSmallUrl ? (
          <Image
            src={item.imageSmallUrl}
            alt={item.name}
            fill
            sizes="(min-width:1280px) 220px, (min-width:768px) 25vw, 45vw"
            unoptimized
            className="object-contain p-2"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        <button
          type="button"
          aria-label={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
          aria-pressed={watchlisted}
          onClick={(e) => {
            e.preventDefault();
            toggleWatchlist(item.id);
          }}
          className="absolute right-1.5 top-1.5 rounded-full bg-background/70 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:text-watchlist"
        >
          <Star className={cn("size-3.5", watchlisted && "fill-watchlist text-watchlist")} />
        </button>
        {item.hasPrice && (
          <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between rounded-md bg-background/80 px-1.5 py-1 backdrop-blur">
            <span className="num-tabular text-xs font-semibold">
              {formatMoney(item.priceRaw, currency)}
            </span>
            {item.priceChangePct != null && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-[10px] font-medium",
                  positive ? "text-positive" : "text-negative"
                )}
              >
                {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {formatPct(item.priceChangePct)}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-2.5">
        <p className="truncate text-sm font-medium leading-tight">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.setName}
          {item.number ? ` · ${item.number}` : ""}
        </p>
      </div>
    </Link>
  );
}
