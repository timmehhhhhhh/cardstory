"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { PCSelector } from "@/app/pc/_components/pc-selector";
import { PCChart } from "@/app/pc/_components/pc-chart";
import { usePCStore } from "@/lib/pc/store";
import { Money } from "@/components/ui/money";
import { formatPct } from "@/lib/utils/format";
import type { EnrichedHolding, PCTotals } from "@/lib/pc/selectors";

export function ValueHeader({
  rows,
  totals,
  showSelector = true,
}: {
  rows: EnrichedHolding[];
  totals: PCTotals;
  /** Set false when there's only ever one pc to show (e.g. Business Inventory) — swaps the pc-switcher dropdown for a static label. */
  showSelector?: boolean;
}) {
  const currency = usePCStore((s) => s.preferences.currency);
  const positive = totals.totalGainLoss >= 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1">
            {showSelector ? (
              <PCSelector />
            ) : (
              <p className="text-sm font-medium text-muted-foreground">Business Inventory</p>
            )}
          </div>
          <p className="num-tabular text-3xl font-bold">
            <Money amountUsd={totals.totalValue} currency={currency} />
          </p>
          {totals.totalCostBasis > 0 && (
            <p
              className={
                "num-tabular mt-1 flex items-center gap-1 text-sm font-medium " +
                (positive ? "text-positive" : "text-negative")
              }
            >
              {positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              <Money amountUsd={totals.totalGainLoss} currency={currency} /> ({formatPct(totals.totalGainLossPct)})
            </p>
          )}
        </div>
      </div>

      <PCChart rows={rows} />
    </div>
  );
}
