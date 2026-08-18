"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PenLine, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardImage } from "@/components/cards/card-image";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { getGameMeta } from "@/lib/games/registry";
import { formatMoney } from "@/lib/utils/format";
import { usePCStore } from "@/lib/pc/store";
import { useShortlistStore } from "@/lib/shortlist/store";
import { CustomItemDialog } from "@/app/shortlist/_components/custom-item-dialog";
import type { CatalogSearchItem } from "@/lib/catalog/search";

/**
 * The in-aisle add affordance: type a name, tap the match. /api/catalog/search
 * already merges TCG and sports rows, so one box covers both.
 */
export function ShortlistAddBar({ onAdded }: { onAdded: (itemId: string) => void }) {
  const currency = usePCStore((s) => s.preferences.currency);
  const lastUsedCostBasisCurrency = usePCStore((s) => s.preferences.lastUsedCostBasisCurrency);
  const addShortlistItem = useShortlistStore((s) => s.addShortlistItem);

  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [customOpen, setCustomOpen] = React.useState(false);
  const [customSeedName, setCustomSeedName] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const query = useQuery<{ items: CatalogSearchItem[] }>({
    queryKey: ["shortlist-search", debounced],
    queryFn: async () => {
      const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(debounced)}&pageSize=6`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debounced.length > 1,
  });

  function addFromCatalog(item: CatalogSearchItem) {
    const isSports = getGameMeta(item.gameId)?.kind === "sports";
    const newId = addShortlistItem({
      kind: isSports ? "sports" : "tcg",
      catalogItemId: isSports ? undefined : item.id,
      sportsCardItemId: isSports ? item.id : undefined,
      quantity: 1,
      // Deliberately 0, not item.priceRaw: this field is what the *shop* is
      // charging and it becomes a cost basis at checkout. Pre-filling the
      // market price would invite recording a price nobody was ever asked
      // to pay. The market figure is shown on the row for comparison.
      askingPrice: 0,
      askingCurrency: lastUsedCostBasisCurrency ?? "USD",
    });
    setQ("");
    setDebounced("");
    onAdded(newId);
  }

  function openCustom(seed: string) {
    setCustomSeedName(seed);
    setCustomOpen(true);
    setQ("");
    setDebounced("");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a card you've spotted…"
            className="bg-background pl-8"
          />
        </div>
        <Button variant="outline" className="shrink-0" onClick={() => openCustom("")}>
          <PenLine className="size-4" />
          <span className="hidden sm:inline">Custom item</span>
        </Button>
      </div>

      {debounced.length > 1 && (
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-background p-1">
          {query.isLoading && <p className="px-2 py-1.5 text-xs text-muted-foreground">Searching…</p>}
          {query.isError && <p className="px-2 py-1.5 text-xs text-negative">Search failed. Try again.</p>}
          {query.data?.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => addFromCatalog(item)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-elevated"
            >
              <div className="relative h-8 w-6 flex-none overflow-hidden rounded bg-muted">
                <CardImage src={item.imageSmallUrl} alt="" className="object-contain" />
              </div>
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <CardNumberBadge number={item.number} className="flex-none" />
              <span className="num-tabular text-xs text-muted-foreground">
                {formatMoney(item.priceRaw, currency)}
              </span>
            </button>
          ))}
          {/* Offered whatever the results look like — this is exactly where
              someone realises the thing in the case isn't in the catalog. */}
          <button
            type="button"
            onClick={() => openCustom(q.trim())}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
          >
            <PenLine className="size-4 flex-none" />
            <span className="min-w-0 truncate">
              Add &ldquo;{q.trim()}&rdquo; as a custom item
            </span>
          </button>
        </div>
      )}

      <CustomItemDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        initialName={customSeedName}
        onAdded={onAdded}
      />
    </div>
  );
}
