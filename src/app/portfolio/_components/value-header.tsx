"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { PortfolioSelector } from "@/app/portfolio/_components/portfolio-selector";
import { PortfolioChart } from "@/app/portfolio/_components/portfolio-chart";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { formatMoney, formatPct } from "@/lib/utils/format";
import type { EnrichedHolding, PortfolioTotals } from "@/lib/portfolio/selectors";

export function ValueHeader({ rows, totals }: { rows: EnrichedHolding[]; totals: PortfolioTotals }) {
  const currency = usePortfolioStore((s) => s.preferences.currency);
  const positive = totals.totalGainLoss >= 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1">
            <PortfolioSelector />
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

      <PortfolioChart rows={rows} />
    </div>
  );
}
