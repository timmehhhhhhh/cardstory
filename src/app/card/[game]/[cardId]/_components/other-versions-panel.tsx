"use client";

import Link from "next/link";
import { usePCStore } from "@/lib/pc/store";
import { Money } from "@/components/ui/money";
import { cardDetailHref } from "@/lib/catalog/card-href";

export interface OtherVersionEntry {
  id: string;
  priceRaw: number | null;
  label: string;
}

/**
 * Cross-links to every other priced finish of this same physical card (see
 * getSiblingVariants in the parent page) — the current variant renders
 * first and highlighted, so a user landing on e.g. the Reverse Holo variant
 * can jump straight to the Holofoil one without going back through Explore.
 * A client component (rather than inline in the server page) purely so it
 * can read the user's currency preference, same as every other price
 * display on this page.
 */
export function OtherVersionsPanel({
  gameId,
  current,
  siblings,
}: {
  gameId: string;
  current: OtherVersionEntry;
  siblings: OtherVersionEntry[];
}) {
  const currency = usePCStore((s) => s.preferences.currency);
  if (siblings.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Other versions of this card
      </p>
      <div className="flex flex-wrap gap-2">
        {[current, ...siblings].map((v) => (
          <Link
            key={v.id}
            href={cardDetailHref(gameId, v.id, false)}
            className={
              v.id === current.id
                ? "flex items-center gap-1.5 rounded-lg border border-primary bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary"
                : "flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-surface-elevated"
            }
          >
            {v.label}
            {v.priceRaw != null && (
              <Money amountUsd={v.priceRaw} currency={currency} className="num-tabular text-muted-foreground" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
