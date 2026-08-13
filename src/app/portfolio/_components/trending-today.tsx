"use client";

import Image from "next/image";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { topByChange } from "@/lib/portfolio/selectors";
import { formatPct } from "@/lib/utils/format";
import type { EnrichedHolding } from "@/lib/portfolio/selectors";

export function TrendingToday({ rows }: { rows: EnrichedHolding[] }) {
  const top = topByChange(rows, 5, "up");
  const hasAny = top.some((r) => r.catalogItem?.priceChangePct != null);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Trending Today</h3>
      {!hasAny ? (
        <p className="text-sm text-muted-foreground">
          No day-over-day change yet — check back after tomorrow&apos;s price snapshot.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {top.map((r) => {
            const pct = r.catalogItem!.priceChangePct!;
            const positive = pct >= 0;
            return (
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
                  <span
                    className={
                      "flex items-center gap-0.5 text-sm font-medium " +
                      (positive ? "text-positive" : "text-negative")
                    }
                  >
                    {positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                    {formatPct(pct)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
