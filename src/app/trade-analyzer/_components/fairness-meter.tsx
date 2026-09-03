"use client";

import { Scale } from "lucide-react";
import { usePCStore } from "@/lib/pc/store";
import { formatMoney } from "@/lib/utils/format";
import { usePricingVisible } from "@/lib/utils/use-pricing-visible";

export function FairnessMeter({ totalA, totalB }: { totalA: number; totalB: number }) {
  const currency = usePCStore((s) => s.preferences.currency);
  const pricingVisible = usePricingVisible();

  if (totalA === 0 && totalB === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
        <Scale className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Add items to both sides to see if the trade is fair.</p>
      </div>
    );
  }

  const total = totalA + totalB;
  const pctA = total > 0 ? (totalA / total) * 100 : 50;
  const diff = Math.abs(totalA - totalB);
  const largerSide = totalA === totalB ? null : totalA > totalB ? "A" : "B";
  const diffPct = Math.min(totalA, totalB) > 0 ? (diff / Math.min(totalA, totalB)) * 100 : 100;

  let verdict: string;
  let verdictTone: "positive" | "warning" | "negative";
  const diffSuffix = pricingVisible ? ` — ${formatMoney(diff, currency)} more.` : ".";
  if (diffPct <= 5) {
    verdict = "This trade looks fair.";
    verdictTone = "positive";
  } else if (diffPct <= 20) {
    verdict = `Side ${largerSide} is slightly ahead${diffSuffix}`;
    verdictTone = "warning";
  } else {
    verdict = `Side ${largerSide} is significantly ahead${diffSuffix}`;
    verdictTone = "negative";
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pctA}%` }}
        />
      </div>
      {pricingVisible && (
        <div className="mb-4 flex justify-between text-xs text-muted-foreground">
          <span>{formatMoney(totalA, currency)}</span>
          <span>{formatMoney(totalB, currency)}</span>
        </div>
      )}
      <p
        className={
          "text-center text-sm font-medium " +
          (verdictTone === "positive"
            ? "text-positive"
            : verdictTone === "warning"
              ? "text-watchlist"
              : "text-negative")
        }
      >
        {verdict}
      </p>
    </div>
  );
}
