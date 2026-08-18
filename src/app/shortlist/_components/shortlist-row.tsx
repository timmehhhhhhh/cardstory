"use client";

import * as React from "react";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardImage } from "@/components/cards/card-image";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/lib/constants";
import { formatMoneyIn } from "@/lib/utils/format";
import { useShortlistStore } from "@/lib/shortlist/store";
import type { EnrichedShortlistItem } from "@/lib/shortlist/selectors";

export function ShortlistRow({
  row,
  selected,
  onToggleSelected,
  autoFocusPrice,
}: {
  row: EnrichedShortlistItem;
  selected: boolean;
  onToggleSelected: (selected: boolean) => void;
  /** Set on the row that was just added, so the next thing typed is its price. */
  autoFocusPrice?: boolean;
}) {
  const updateShortlistItem = useShortlistStore((s) => s.updateShortlistItem);
  const removeShortlistItems = useShortlistStore((s) => s.removeShortlistItems);

  // The price field keeps its own draft string and only commits on blur.
  // Committing per keystroke would be a PATCH per character once the store
  // is server-backed — on shop wifi, from a phone.
  const [priceDraft, setPriceDraft] = React.useState(() => String(row.askingPrice || ""));
  const [prevPrice, setPrevPrice] = React.useState(row.askingPrice);
  if (row.askingPrice !== prevPrice) {
    // The value changed underneath us (another device, a reconcile) — adopt
    // it rather than leaving a stale draft. Adjusted during render per
    // https://react.dev/learn/you-might-not-need-an-effect
    setPrevPrice(row.askingPrice);
    setPriceDraft(String(row.askingPrice || ""));
  }

  function commitPrice() {
    const next = Number(priceDraft);
    const clean = Number.isFinite(next) && next >= 0 ? next : 0;
    setPriceDraft(String(clean || ""));
    if (clean !== row.askingPrice) updateShortlistItem(row.id, { askingPrice: clean });
  }

  const marketHint = row.marketUnitPriceInAskingCurrency;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface px-3 py-2.5">
      <Checkbox
        checked={selected}
        onCheckedChange={(v) => onToggleSelected(v === true)}
        aria-label={`Select ${row.display.name}`}
      />

      <div className="relative h-12 w-9 flex-none overflow-hidden rounded bg-muted">
        <CardImage src={row.display.imageUrl} alt="" className="object-contain" />
      </div>

      <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          {row.display.href ? (
            <Link href={row.display.href} className="min-w-0 truncate text-sm font-medium hover:underline">
              {row.display.name}
            </Link>
          ) : (
            <span className="min-w-0 truncate text-sm font-medium">{row.display.name}</span>
          )}
          <CardNumberBadge number={row.display.number} className="flex-none" />
        </div>
        <span className="truncate text-xs text-muted-foreground">{row.display.subtitle}</span>
        {marketHint != null && (
          <span className="num-tabular text-xs text-muted-foreground">
            Market ~{formatMoneyIn(marketHint, row.askingCurrency)} ea
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() => updateShortlistItem(row.id, { quantity: Math.max(1, row.quantity - 1) })}
          className="rounded p-1 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="num-tabular w-5 text-center text-sm">{row.quantity}</span>
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => updateShortlistItem(row.id, { quantity: row.quantity + 1 })}
          className="rounded p-1 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <Select
          value={row.askingCurrency}
          onValueChange={(v) => updateShortlistItem(row.id, { askingCurrency: v as SupportedCurrency })}
        >
          <SelectTrigger size="sm" className="w-[76px] shrink-0 bg-background" aria-label="Asking currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CURRENCIES.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          step="0.01"
          min={0}
          inputMode="decimal"
          autoFocus={autoFocusPrice}
          aria-label={`Asking price for ${row.display.name}`}
          placeholder="0.00"
          value={priceDraft}
          onChange={(e) => setPriceDraft(e.target.value)}
          onBlur={commitPrice}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="num-tabular w-24 bg-background"
        />
      </div>

      <span className="num-tabular w-20 flex-none text-right text-sm font-medium">
        {formatMoneyIn(row.askingTotal, row.askingCurrency)}
      </span>

      <button
        type="button"
        aria-label={`Remove ${row.display.name}`}
        onClick={() => removeShortlistItems([row.id])}
        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-negative"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
