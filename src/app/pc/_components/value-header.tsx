"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { PCSelector } from "@/app/pc/_components/pc-selector";
import { PCChart } from "@/app/pc/_components/pc-chart";
import { usePCStore } from "@/lib/pc/store";
import { formatMoney, formatPct } from "@/lib/utils/format";
import type { EnrichedHolding, PCTotals } from "@/lib/pc/selectors";

export function ValueHeader({ rows, totals }: { rows: EnrichedHolding[]; totals: PCTotals }) {
  const currency = usePCStore((s) => s.preferences.currency);
  const positive = totals.totalGainLoss >= 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1">
            <PCSelector />
          </div>
          <p className="num-tabular text-3xl font-bold">{formatMoney(totals.totalValue, currency)}</p>
          {totals.totalCostBasis > 0 && (
            <p
              className={
                "num-tabular mt-1 flex items-center gap-1 text-sm font-medium " +
                (positive ? "text-positive" : "text-negative")
              }
            >
              {positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              {formatMoney(totals.totalGainLoss, currency)} ({formatPct(totals.totalGainLossPct)})
            </p>
          )}
        </div>
      </div>

      <PCChart rows={rows} />
    </div>
  );
}
