"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StockLineChart } from "@/components/charts/stock-line-chart";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { formatMoney, formatPct } from "@/lib/utils/format";
import { PRICE_HISTORY_RANGES, type PriceHistoryRange } from "@/lib/constants";

interface HistoryResponse {
  range: PriceHistoryRange;
  points: { date: string; priceRaw: number | null }[];
}

export function PriceHistoryPanel({
  gameId,
  cardExternalId,
  currentPriceRaw,
  currentChangePct,
}: {
  gameId: string;
  cardExternalId: string;
  currentPriceRaw: number | null;
  currentChangePct: number | null;
}) {
  const [range, setRange] = React.useState<PriceHistoryRange>("3M");
  const currency = usePortfolioStore((s) => s.preferences.currency);

  const query = useQuery<HistoryResponse>({
    queryKey: ["price-history", gameId, cardExternalId, range],
    queryFn: async () => {
      const res = await fetch(
        `/api/price-history/${gameId}/${encodeURIComponent(cardExternalId)}?range=${range}`
      );
      if (!res.ok) throw new Error("Failed to load price history");
      return res.json();
    },
  });

  const points = query.data?.points ?? [];
  const realPointCount = points.filter((p) => p.priceRaw != null).length;
  const positive = (currentChangePct ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ungraded Price History
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="num-tabular text-2xl font-bold">
              {formatMoney(currentPriceRaw, currency)}
            </span>
            {currentChangePct != null && (
              <span
                className={
                  "flex items-center gap-0.5 text-sm font-medium " +
                  (positive ? "text-positive" : "text-negative")
                }
              >
                {positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                {formatPct(currentChangePct)}
              </span>
            )}
          </div>
        </div>

        <Tabs value={range} onValueChange={(v) => setRange(v as PriceHistoryRange)}>
          <TabsList className="bg-surface-elevated">
            {PRICE_HISTORY_RANGES.map((r) => (
              <TabsTrigger key={r} value={r} className="text-xs">
                {r}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-[220px] w-full rounded-lg" />
      ) : realPointCount < 2 ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center">
          <Clock className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">Price history is still building</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            We record a real price snapshot for this card once a day — check back after a few days
            to see the trend take shape.
          </p>
        </div>
      ) : (
        <StockLineChart
          points={points.map((p) => ({ date: p.date, value: p.priceRaw }))}
          currency={currency}
        />
      )}
    </div>
  );
}
