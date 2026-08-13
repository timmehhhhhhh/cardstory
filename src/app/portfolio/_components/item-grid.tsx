"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { formatMoney, formatPct } from "@/lib/utils/format";
import type { EnrichedHolding } from "@/lib/portfolio/selectors";

export function ItemGrid({
  rows,
  bulkMode,
  selected,
  onToggleSelect,
  activePortfolioId,
}: {
  rows: EnrichedHolding[];
  bulkMode: boolean;
  selected: Set<string>;
  onToggleSelect: (holdingId: string) => void;
  activePortfolioId: string;
}) {
  const currency = usePortfolioStore((s) => s.preferences.currency);
  const removeHoldings = usePortfolioStore((s) => s.removeHoldings);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="font-medium">Nothing here yet</p>
        <p className="text-sm text-muted-foreground">
          Head to <Link href="/explore" className="text-primary hover:underline">Explore</Link> and add a
          card, or use &quot;Add Sports Card&quot; above.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => {
        const positive = r.gainLoss >= 0;
        const content = (
          <>
            <div className="relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
              {r.display.imageUrl && (
                <Image src={r.display.imageUrl} alt="" fill unoptimized className="object-contain" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.display.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.display.subtitle} · Qty {r.quantity}
                {r.condition === "graded" && ` · ${r.gradeCompany ?? ""} ${r.gradeValue ?? ""}`}
              </p>
            </div>
          </>
        );

        return (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
          >
            {bulkMode && (
              <Checkbox
                checked={selected.has(r.id)}
                onCheckedChange={() => onToggleSelect(r.id)}
                aria-label="Select item"
              />
            )}
            {r.display.href ? (
              <Link href={r.display.href} className="flex min-w-0 flex-1 items-center gap-3">
                {content}
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
            )}
            <div className="w-24 flex-none text-right">
              <p className="num-tabular text-sm font-semibold">{formatMoney(r.marketValue, currency)}</p>
              {r.gainLossPct != null && (
                <p
                  className={cn(
                    "num-tabular flex items-center justify-end gap-0.5 text-xs",
                    positive ? "text-positive" : "text-negative"
                  )}
                >
                  {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {formatPct(r.gainLossPct)}
                </p>
              )}
            </div>
            {!bulkMode && (
              <button
                type="button"
                aria-label="Remove from portfolio"
                onClick={() => removeHoldings(activePortfolioId, [r.id])}
                className="flex-none rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-negative"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
