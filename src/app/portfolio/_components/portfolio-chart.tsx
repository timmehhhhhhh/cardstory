"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StockLineChart } from "@/components/charts/stock-line-chart";
import { PORTFOLIO_CHART_RANGES, type PortfolioChartRange } from "@/lib/constants";
import { usePortfolioStore } from "@/lib/portfolio/store";
import type { EnrichedHolding } from "@/lib/portfolio/selectors";

export function PortfolioChart({ rows }: { rows: EnrichedHolding[] }) {
  const [range, setRange] = React.useState<PortfolioChartRange>("1M");
  const currency = usePortfolioStore((s) => s.preferences.currency);

  const holdingsPayload = React.useMemo(
    () => rows.map((r) => ({ catalogItemId: r.catalogItemId, quantity: r.quantity, acquiredAt: r.acquiredAt })),
    [rows]
  );

  const query = useQuery<{ points: { date: string; value: number }[] }>({
    queryKey: ["portfolio-value-history", holdingsPayload, range],
    queryFn: async () => {
      const res = await fetch("/api/portfolio/value-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings: holdingsPayload, range }),
      });
      if (!res.ok) throw new Error("Failed to load value history");
      return res.json();
    },
    enabled: holdingsPayload.length > 0,
  });

  const points = query.data?.points ?? [];

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Tabs value={range} onValueChange={(v) => setRange(v as PortfolioChartRange)}>
          <TabsList className="bg-surface-elevated">
            {PORTFOLIO_CHART_RANGES.map((r) => (
              <TabsTrigger key={r} value={r} className="text-xs">
                {r}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {holdingsPayload.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Add cards to see your portfolio value over time.
        </div>
      ) : query.isLoading ? (
        <Skeleton className="h-[180px] w-full rounded-lg" />
      ) : points.length < 2 ? (
        <div className="flex h-[180px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-center">
          <p className="text-sm font-medium">Value history is still building</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Check back after the next daily price snapshot to see a trend line.
          </p>
        </div>
      ) : (
        <StockLineChart points={points.map((p) => ({ date: p.date, value: p.value }))} currency={currency} height={180} />
      )}
    </div>
  );
}
