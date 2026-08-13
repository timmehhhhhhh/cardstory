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
          {top.map((r) => (
            <li key={r.id}>
              <Link
                href={r.catalogItem ? `/card/${r.catalogItem.gameId}/${r.catalogItem.externalId}` : "#"}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-surface-elevated"
              >
                <div className="relative size-8 flex-none overflow-hidden rounded bg-muted">
                  {r.catalogItem?.imageSmallUrl && (
                    <Image src={r.catalogItem.imageSmallUrl} alt="" fill unoptimized className="object-contain" />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm">{r.catalogItem?.name ?? r.catalogItemId}</span>
                <span className="num-tabular text-sm font-medium">{formatMoney(r.marketValue, currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
