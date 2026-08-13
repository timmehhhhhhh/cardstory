"use client";

import Image from "next/image";
import Link from "next/link";
import { topByValue } from "@/lib/portfolio/selectors";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { formatMoney } from "@/lib/utils/format";
import type { EnrichedHolding } from "@/lib/portfolio/selectors";

export function MostValuable({ rows }: { rows: EnrichedHolding[] }) {
  const currency = usePortfolioStore((s) => s.preferences.currency);
  const top = topByValue(rows, 5);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Most Valuable</h3>
      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {top.map((r) => {
            const row = (
              <>
                <div className="relative size-8 flex-none overflow-hidden rounded bg-muted">
                  {r.display.imageUrl && (
                    <Image src={r.display.imageUrl} alt="" fill unoptimized className="object-contain" />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm">{r.display.name}</span>
                <span className="num-tabular text-sm font-medium">{formatMoney(r.marketValue, currency)}</span>
              </>
            );
            return (
              <li key={r.id}>
                {r.display.href ? (
                  <Link href={r.display.href} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-surface-elevated">
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg px-1.5 py-1">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
