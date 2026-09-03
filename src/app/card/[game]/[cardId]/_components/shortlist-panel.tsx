"use client";

import * as React from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useShortlistStore } from "@/lib/shortlist/store";
import { useAddToShortlist } from "@/lib/shortlist/use-add-to-shortlist";
import { formatMoneyIn } from "@/lib/utils/format";
import { usePricingVisible } from "@/lib/utils/use-pricing-visible";

/**
 * This card's In-Store Shortlist entries, right on its own detail page —
 * quantity +/- and remove, same convention as CollectionPanel's owned-
 * holdings list, plus a one-click add when nothing's shortlisted yet (see
 * useAddToShortlist). Full editing (asking price/currency/notes) still
 * lives on /shortlist itself; this is the quick-adjust surface.
 */
export function ShortlistPanel({
  catalogItemId,
  sportsCardItemId,
  cardName,
}: {
  catalogItemId?: string;
  sportsCardItemId?: string;
  cardName: string;
}) {
  const items = useShortlistStore((s) => s.items);
  const updateShortlistItem = useShortlistStore((s) => s.updateShortlistItem);
  const removeShortlistItems = useShortlistStore((s) => s.removeShortlistItems);
  const addToShortlist = useAddToShortlist();
  const pricingVisible = usePricingVisible();

  const matching = React.useMemo(
    () =>
      items.filter(
        (i) =>
          (catalogItemId && i.catalogItemId === catalogItemId) ||
          (sportsCardItemId && i.sportsCardItemId === sportsCardItemId)
      ),
    [items, catalogItemId, sportsCardItemId]
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">Shortlist</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        {matching.length > 0
          ? `${matching.reduce((sum, i) => sum + i.quantity, 0)} shortlisted for ${cardName}.`
          : "Spotted this while shopping? Add it to your In-Store Shortlist."}
      </p>

      {matching.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1.5">
          {matching.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate text-muted-foreground">
                {item.askingPrice > 0 && pricingVisible
                  ? `Asking ${formatMoneyIn(item.askingPrice, item.askingCurrency)} ea`
                  : (item.source ?? "Added manually")}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  title="Decrease quantity"
                  onClick={() => updateShortlistItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Minus className="size-4" />
                </button>
                <span className="num-tabular w-5 text-center">{item.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  title="Increase quantity"
                  onClick={() => updateShortlistItem(item.id, { quantity: item.quantity + 1 })}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Plus className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Remove from shortlist"
                  title="Remove from shortlist"
                  onClick={() => removeShortlistItems([item.id])}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-negative"
                >
                  <Trash2 className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() =>
          addToShortlist({
            kind: sportsCardItemId ? "sports" : "tcg",
            catalogItemId,
            sportsCardItemId,
            source: "Card Detail",
          })
        }
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
      >
        <ShoppingBag className="size-4" />
        Add to Shortlist
      </button>
    </div>
  );
}
