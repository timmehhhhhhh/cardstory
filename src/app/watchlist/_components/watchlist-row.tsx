"use client";

import Link from "next/link";
import { Star, TrendingDown, TrendingUp } from "lucide-react";
import { CardImage } from "@/components/cards/card-image";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { GameBadge } from "@/components/cards/game-badge";
import { Money } from "@/components/ui/money";
import { usePCStore } from "@/lib/pc/store";
import { formatMoney, formatPct } from "@/lib/utils/format";
import { usePricingVisible } from "@/lib/utils/use-pricing-visible";
import type { EnrichedWatchlistItem } from "@/lib/watchlist/selectors";

export function WatchlistRow({ row }: { row: EnrichedWatchlistItem }) {
  const currency = usePCStore((s) => s.preferences.currency);
  const toggleWatchlist = usePCStore((s) => s.toggleWatchlist);
  const pricingVisible = usePricingVisible();

  const priceChangePct =
    row.priceAtAdd != null && row.priceAtAdd > 0 && row.priceChangeSinceAdd != null
      ? (row.priceChangeSinceAdd / row.priceAtAdd) * 100
      : null;
  const positive = (priceChangePct ?? 0) >= 0;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface px-3 py-2.5">
      <div className="relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
        <CardImage src={row.display.imageUrl} alt="" className="object-contain" />
      </div>

      <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          {row.display.href ? (
            <Link href={row.display.href} className="min-w-0 truncate text-sm font-medium hover:underline">
              {row.display.name}
            </Link>
          ) : (
            <span className="min-w-0 truncate text-sm font-medium">{row.display.name}</span>
          )}
          <CardNumberBadge number={row.display.number} className="flex-none" />
          {row.catalogItem && <GameBadge gameId={row.catalogItem.gameId} className="flex-none" />}
        </div>
        {row.display.nameEn && (
          <span className="truncate text-xs text-muted-foreground">{row.display.nameEn}</span>
        )}
        <span className="truncate text-xs text-muted-foreground">{row.display.subtitle}</span>
        <span className="truncate text-[11px] text-muted-foreground/80">
          Added {new Date(row.addedAt).toLocaleDateString()}
        </span>
      </div>

      <div className="flex flex-col items-end gap-0.5 text-right">
        <span className="num-tabular text-sm font-semibold">
          <Money amountUsd={row.marketPrice} currency={currency} />
        </span>
        {row.priceAtAdd != null && (
          <span className="text-[11px] text-muted-foreground">
            {pricingVisible ? `${formatMoney(row.priceAtAdd, currency)} at add` : "•••• at add"}
          </span>
        )}
        {priceChangePct != null && pricingVisible && (
          <span
            className={
              "flex items-center gap-0.5 text-xs font-medium " +
              (positive ? "text-positive" : "text-negative")
            }
          >
            {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {formatPct(priceChangePct)}
          </span>
        )}
      </div>

      <button
        type="button"
        aria-label="Remove from watchlist"
        aria-pressed="true"
        onClick={() => toggleWatchlist(row.itemId, row.kind, row.priceAtAdd)}
        className="flex-none rounded-md p-1.5 text-watchlist hover:bg-surface-elevated"
      >
        <Star className="size-4 fill-watchlist" />
      </button>
    </div>
  );
}
