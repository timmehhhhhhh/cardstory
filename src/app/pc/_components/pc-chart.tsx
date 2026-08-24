"use client";

import * as React from "react";
import Link from "next/link";
import { EyeOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StockLineChart } from "@/components/charts/stock-line-chart";
import { PC_CHART_RANGES, type PCChartRange } from "@/lib/constants";
import { usePCStore } from "@/lib/pc/store";
import { usePricingVisible } from "@/lib/utils/use-pricing-visible";
import type { EnrichedHolding } from "@/lib/pc/selectors";

export function PCChart({ rows }: { rows: EnrichedHolding[] }) {
  const [range, setRange] = React.useState<PCChartRange>("1M");
  const currency = usePCStore((s) => s.preferences.currency);
  const pricingVisible = usePricingVisible();

  const holdingsPayload = React.useMemo(
    () =>
      rows.map((r) => ({
        catalogItemId: r.catalogItemId,
        quantity: r.quantity,
        acquiredAt: r.acquiredAt,
        createdAt: r.createdAt,
      })),
    [rows]
  );

  const query = useQuery<{ points: { date: string; value: number }[] }>({
    queryKey: ["pc-value-history", holdingsPayload, range],
    queryFn: async () => {
      const res = await fetch("/api/pc/value-history", {
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

  if (!pricingVisible) {
    return (
      <div className="flex h-[180px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        <EyeOff className="size-4" />
        <p>Pricing is hidden</p>
        <Link href="/settings" className="text-xs underline underline-offset-2">
          Change in Settings
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Tabs value={range} onValueChange={(v) => setRange(v as PCChartRange)}>
          <TabsList className="bg-surface-elevated">
            {PC_CHART_RANGES.map((r) => (
              <TabsTrigger key={r} value={r} className="text-xs">
                {r}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {holdingsPayload.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Add cards to see your PC value over time.
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
