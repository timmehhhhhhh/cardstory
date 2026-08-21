"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { usePCStore } from "@/lib/pc/store";
import { formatMoney } from "@/lib/utils/format";
import type { CatalogSearchItem } from "@/lib/catalog/search";
import type { TradeItem } from "@/app/trade-analyzer/_components/types";
import { CardImage } from "@/components/cards/card-image";

export function SideSelector({
  label,
  items,
  onAdd,
  onSetQuantity,
  onRemove,
}: {
  label: string;
  items: TradeItem[];
  onAdd: (item: CatalogSearchItem) => void;
  onSetQuantity: (catalogItemId: string, quantity: number) => void;
  onRemove: (catalogItemId: string) => void;
}) {
  const currency = usePCStore((s) => s.preferences.currency);
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const query = useQuery<{ items: CatalogSearchItem[] }>({
    queryKey: ["trade-search", debounced],
    queryFn: async () => {
      const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(debounced)}&pageSize=6`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debounced.length > 1,
  });

  const subtotal = items.reduce((sum, i) => sum + (i.priceRaw ?? 0) * i.quantity, 0);

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold">{label}</h2>

      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a card to add…"
          className="bg-background pl-8"
        />
      </div>

      {debounced.length > 1 && (
        <div className="mb-3 flex flex-col gap-1 rounded-lg border border-border bg-background p-1">
          {query.isLoading && <p className="px-2 py-1.5 text-xs text-muted-foreground">Searching…</p>}
          {query.data?.items.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No matches.</p>
          )}
          {query.data?.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onAdd(item);
                setQ("");
              }}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-elevated"
            >
              <div className="relative h-8 w-6 flex-none overflow-hidden rounded bg-muted">
                <CardImage src={item.imageSmallUrl} alt="" className="object-contain" />
              </div>
              <span className="min-w-0 flex-1 truncate" title={item.nameEn ?? undefined}>
                {item.name}
              </span>
              <CardNumberBadge number={item.number} className="flex-none" />
              <span className="num-tabular text-xs text-muted-foreground">
                {formatMoney(item.priceRaw, currency)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No items added yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.catalogItemId} className="flex items-center gap-2 rounded-lg border border-border px-2 py-2">
              <div className="relative h-10 w-7 flex-none overflow-hidden rounded bg-muted">
                <CardImage src={item.imageSmallUrl} alt="" className="object-contain" />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm" title={item.nameEn ?? undefined}>
                {item.name}
              </span>
              <CardNumberBadge number={item.number} className="flex-none" />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => onSetQuantity(item.catalogItemId, Math.max(1, item.quantity - 1))}
                  className="rounded p-1 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="num-tabular w-5 text-center text-sm">{item.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => onSetQuantity(item.catalogItemId, item.quantity + 1)}
                  className="rounded p-1 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <span className="num-tabular w-16 flex-none text-right text-sm font-medium">
                {formatMoney((item.priceRaw ?? 0) * item.quantity, currency)}
              </span>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onRemove(item.catalogItemId)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-negative"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <span className="num-tabular text-lg font-bold">{formatMoney(subtotal, currency)}</span>
      </div>
    </div>
  );
}
