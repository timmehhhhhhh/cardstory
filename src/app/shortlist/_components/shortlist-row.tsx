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
import { CardStack } from "@/components/cards/card-stack";
import { CardStoryDialog } from "@/components/cards/card-story-dialog";
import { groupShortlistIntoStacks, shortlistToStoryFace } from "@/lib/collections/stacks";

/**
 * One row's worth of content for a single shortlist item — the front (or
 * only) face of a card stack (see card-stack.tsx). Pulled out of
 * ShortlistRow so both a lone entry and every face of a duplicate stack
 * (the same card added from a few different shops/visits) render through
 * the exact same markup.
 */
function ShortlistRowFace({
  row,
  selected,
  onToggleSelected,
  autoFocusPrice,
  stackBadge,
}: {
  row: EnrichedShortlistItem;
  selected: boolean;
  onToggleSelected: (selected: boolean) => void;
  /** Set on the row that was just added, so the next thing typed is its price. */
  autoFocusPrice?: boolean;
  /** "1 of 3" when this face belongs to a stack — shown alongside the source line. */
  stackBadge?: string;
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
      {/* onPointerDown stopped on every interactive control below: when this
          face sits inside a CardStack, its outer wrapper listens for
          pointerdown/up on the whole row to detect swipe-vs-tap — without
          this, using a control would also register as a tap and open the
          card-story dialog at the same time. */}
      <span onPointerDown={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onToggleSelected(v === true)}
          aria-label={`Select ${row.display.name}`}
        />
      </span>

      <div className="relative h-12 w-9 flex-none overflow-hidden rounded bg-muted">
        <CardImage src={row.display.imageUrl} alt="" className="object-contain" />
      </div>

      <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          {row.display.href ? (
            <Link
              href={row.display.href}
              onPointerDown={(e) => e.stopPropagation()}
              className="min-w-0 truncate text-sm font-medium hover:underline"
            >
              {row.display.name}
            </Link>
          ) : (
            <span className="min-w-0 truncate text-sm font-medium">{row.display.name}</span>
          )}
          <CardNumberBadge number={row.display.number} className="flex-none" />
        </div>
        {row.display.nameEn && (
          <span className="truncate text-xs text-muted-foreground">{row.display.nameEn}</span>
        )}
        <span className="truncate text-xs text-muted-foreground">{row.display.subtitle}</span>
        <span className="truncate text-[11px] text-muted-foreground/80">
          {stackBadge ? `${stackBadge} · ` : ""}
          {row.source ?? "Added manually"}
        </span>
        {marketHint != null && (
          <span className="num-tabular text-xs text-muted-foreground">
            Market ~{formatMoneyIn(marketHint, row.askingCurrency)} ea
          </span>
        )}
      </div>

      <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
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

      <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
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
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => removeShortlistItems([row.id])}
        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-negative"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function ShortlistRow({
  row,
  selected,
  onToggleSelected,
  autoFocusPrice,
}: {
  row: EnrichedShortlistItem;
  selected: boolean;
  onToggleSelected: (selected: boolean) => void;
  autoFocusPrice?: boolean;
}) {
  return (
    <ShortlistRowFace
      row={row}
      selected={selected}
      onToggleSelected={onToggleSelected}
      autoFocusPrice={autoFocusPrice}
    />
  );
}

/**
 * Groups shortlist rows into stacks (same card added more than once — a
 * few different shops, a few different visits) and renders each as a
 * CardStack: "1 of N" swipeable, tap to read that entry's story (when it
 * was added, from where, at what asking price). Rows the current
 * selection/checkout logic keys on are still every underlying
 * ShortlistItem id — a stack only changes how they're displayed, not what
 * "select all" or checkout operate over.
 */
export function ShortlistStackedRows({
  rows,
  selected,
  onToggleSelected,
  focusId,
}: {
  rows: EnrichedShortlistItem[];
  selected: Set<string>;
  onToggleSelected: (id: string, selected: boolean) => void;
  focusId: string | null;
}) {
  const [storyStack, setStoryStack] = React.useState<{
    faces: EnrichedShortlistItem[];
    index: number;
  } | null>(null);

  const stacks = groupShortlistIntoStacks(rows);

  return (
    <>
      {stacks.map((stack) => (
        <CardStack
          key={stack.key}
          stack={stack}
          variant="row"
          onActivate={(face, index) => setStoryStack({ faces: stack.faces, index })}
          renderFace={(row, { index, total }) => (
            <ShortlistRowFace
              key={row.id}
              row={row}
              selected={selected.has(row.id)}
              onToggleSelected={(v) => onToggleSelected(row.id, v)}
              autoFocusPrice={row.id === focusId}
              stackBadge={total > 1 ? `${index + 1} of ${total}` : undefined}
            />
          )}
        />
      ))}
      {storyStack && (
        <CardStoryDialog
          faces={storyStack.faces.map(shortlistToStoryFace)}
          initialIndex={storyStack.index}
          open={storyStack !== null}
          onOpenChange={(open) => {
            if (!open) setStoryStack(null);
          }}
        />
      )}
    </>
  );
}
