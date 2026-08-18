"use client";

import { ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoneyIn } from "@/lib/utils/format";
import type { ShortlistTotals } from "@/lib/shortlist/selectors";

/**
 * The till bar: what you're about to pay, and the button that turns it into
 * holdings. Sticky so it stays reachable one-thumbed while scrolling a long
 * list in a shop.
 */
export function ShortlistCheckoutBar({
  totals,
  allSelected,
  onSelectAll,
  onClear,
  onCheckout,
}: {
  /** Totals for the SELECTED rows only. */
  totals: ShortlistTotals;
  allSelected: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  if (totals.itemCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-primary/40 bg-surface-elevated px-4 py-3 shadow-lg">
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {totals.itemCount} selected · {totals.cardCount} card{totals.cardCount === 1 ? "" : "s"}
        </span>
        {/* One line per currency — never summed together. These are the
            amounts about to be handed over at a counter, and this app's FX
            rates are a static table, so a blended figure would be a wrong
            number in front of a real transaction. */}
        <span className="num-tabular text-lg font-bold">
          {totals.byCurrency.map((c) => formatMoneyIn(c.total, c.currency)).join("  +  ")}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {!allSelected && (
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            Select all
          </Button>
        )}
        <Button onClick={onCheckout}>
          <ShoppingBag className="size-4" /> I bought these
        </Button>
        <button
          type="button"
          aria-label="Clear selection"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
