"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { PackagePlus, Star, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { GameBadge } from "@/components/cards/game-badge";
import { AddHoldingDialog } from "@/components/portfolio/add-holding-dialog";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { formatMoney, formatPct } from "@/lib/utils/format";
import { getGameMeta } from "@/lib/games/registry";
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
  const isSports = getGameMeta(item.gameId)?.kind === "sports";
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);

  // The whole tile is a "stretched link" (a full-bleed <Link> layered
  // beneath everything, see below) rather than the action buttons living
  // inside a wrapping <Link>. Nesting interactive controls inside a <Link>
  // means their clicks have to fight the link for the event — even a
  // `preventDefault` that stops the immediate navigation can leave Next's
  // router with a scheduled-but-uncommitted transition that fires later
  // (e.g. when the dialog closes and hands focus back to the trigger).
  // Structuring these as siblings avoids that class of bug entirely.
  const addToCollectionTrigger = (className: string) => (
    <button
      type="button"
      aria-label="Add to collection"
      onClick={() => setAddDialogOpen(true)}
      className={className}
    >
      <PackagePlus className="size-3.5" />
    </button>
  );

  const watchlistTrigger = (className: string) => (
    <button
      type="button"
      aria-label={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={watchlisted}
      onClick={() => toggleWatchlist(item.id)}
      className={className}
    >
      <Star className={cn("size-4", watchlisted && "fill-watchlist text-watchlist")} />
    </button>
  );

  const dialog = (
    <AddHoldingDialog
      catalogItemId={isSports ? undefined : item.id}
      sportsCardItemId={isSports ? item.id : undefined}
      cardName={item.name}
      suggestedPrice={item.priceRaw}
      open={addDialogOpen}
      onOpenChange={setAddDialogOpen}
    />
  );

  if (view === "list") {
    return (
      <div className="relative flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 transition-colors hover:bg-surface-elevated">
        <Link href={href} aria-label={item.name} className="absolute inset-0 z-0" />
        <div className="pointer-events-none relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
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
        <div className="pointer-events-none min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.setName}
            {item.number ? ` · ${item.number}` : ""}
            {item.artist ? ` · ${item.artist}` : ""}
          </p>
        </div>
        <GameBadge gameId={item.gameId} className="pointer-events-none hidden sm:inline-flex" />
        <div className="pointer-events-none w-24 flex-none text-right">
          <p className="num-tabular text-sm font-semibold">{formatMoney(item.priceRaw, currency)}</p>
          {item.priceChangePct != null && (
            <p className={cn("num-tabular text-xs", positive ? "text-positive" : "text-negative")}>
              {formatPct(item.priceChangePct)}
            </p>
          )}
        </div>
        {addToCollectionTrigger(
          "relative z-10 flex-none rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary"
        )}
        {dialog}
        {watchlistTrigger(
          "relative z-10 flex-none rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-watchlist"
        )}
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-primary/40 hover:bg-surface-elevated">
      <Link href={href} aria-label={item.name} className="absolute inset-0 z-0" />
      <div className="pointer-events-none relative aspect-[5/7] w-full bg-muted">
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
        <div className="pointer-events-auto absolute right-1.5 top-1.5 z-10 flex flex-col gap-1">
          {addToCollectionTrigger(
            "rounded-full bg-background/70 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:text-primary"
          )}
          {watchlistTrigger(
            "rounded-full bg-background/70 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:text-watchlist"
          )}
        </div>
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
      <div className="pointer-events-none flex flex-col gap-0.5 p-2.5">
        <p className="truncate text-sm font-medium leading-tight">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.setName}
          {item.number ? ` · ${item.number}` : ""}
        </p>
        {item.cardType && <p className="truncate text-[11px] text-muted-foreground/80">{item.cardType}</p>}
        {item.artist && <p className="truncate text-[11px] text-muted-foreground/80">{item.artist}</p>}
      </div>
      {dialog}
    </div>
  );
}
