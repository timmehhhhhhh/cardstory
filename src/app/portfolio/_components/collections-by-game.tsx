"use client";

import Link from "next/link";
import { groupByGame } from "@/lib/portfolio/selectors";
import { usePortfolioStore } from "@/lib/portfolio/store";
import { formatMoney } from "@/lib/utils/format";
import type { EnrichedHolding } from "@/lib/portfolio/selectors";

export function CollectionsByGame({ rows }: { rows: EnrichedHolding[] }) {
  const currency = usePortfolioStore((s) => s.preferences.currency);
  const groups = groupByGame(rows);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Collections by game</h3>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((g) => {
            const isTcgGame = !g.groupKey.startsWith("sports:") && g.groupKey !== "unknown";
            const row = (
              <>
                <span>
                  {g.groupLabel} <span className="text-muted-foreground">· {g.itemCount}</span>
                </span>
                <span className="num-tabular font-medium">{formatMoney(g.value, currency)}</span>
              </>
            );
            return (
              <li key={g.groupKey}>
                {isTcgGame ? (
                  <Link
                    href={`/explore?game=${g.groupKey}`}
                    className="flex items-center justify-between rounded-lg px-1.5 py-1 text-sm hover:bg-surface-elevated"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between rounded-lg px-1.5 py-1 text-sm">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
