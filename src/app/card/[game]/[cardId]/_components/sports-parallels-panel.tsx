"use client";

import Link from "next/link";
import { usePCStore } from "@/lib/pc/store";
import { Money } from "@/components/ui/money";
import { cardDetailHref } from "@/lib/catalog/card-href";
import type { SportsCardVariant } from "@/lib/sportscards/manage";

/**
 * Sports-card equivalent of OtherVersionsPanel — every parallel/refractor
 * this card was released as (see getSportsCardGroupVariants in the parent
 * page), ordered Base first then least-to-most rare, ending at any 1-of-1.
 * The current row renders first and highlighted. A client component purely
 * to read the user's currency preference, same as OtherVersionsPanel.
 */
export function SportsParallelsPanel({
  gameId,
  currentId,
  variants,
}: {
  gameId: string;
  currentId: string;
  variants: SportsCardVariant[];
}) {
  const currency = usePCStore((s) => s.preferences.currency);
  const others = variants.filter((v) => v.sportsCardItemId !== currentId);
  if (others.length === 0) return null;

  const current = variants.find((v) => v.sportsCardItemId === currentId);
  const ordered = current ? [current, ...others] : others;

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Parallels &amp; refractors
      </p>
      <div className="flex flex-wrap gap-2">
        {ordered.map((v) => {
          const label = v.parallelName ? `${v.parallelName}${v.serialLimit ? ` /${v.serialLimit}` : ""}` : "Base";
          return (
            <Link
              key={v.sportsCardItemId}
              href={cardDetailHref(gameId, v.sportsCardItemId, true)}
              className={
                v.sportsCardItemId === currentId
                  ? "flex items-center gap-1.5 rounded-lg border border-primary bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary"
                  : "flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-surface-elevated"
              }
            >
              {label}
              {v.priceRaw != null && (
                <Money amountUsd={v.priceRaw} currency={currency} className="num-tabular text-muted-foreground" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
