"use client";

import * as React from "react";
import { ArrowLeftRight } from "lucide-react";
import { SideSelector } from "@/app/trade-analyzer/_components/side-selector";
import { FairnessMeter } from "@/app/trade-analyzer/_components/fairness-meter";
import type { TradeItem } from "@/app/trade-analyzer/_components/types";
import type { CatalogSearchItem } from "@/lib/catalog/search";

function useTradeSide() {
  const [items, setItems] = React.useState<TradeItem[]>([]);

  const add = React.useCallback((item: CatalogSearchItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.catalogItemId === item.id)) {
        return prev.map((i) =>
          i.catalogItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          catalogItemId: item.id,
          gameId: item.gameId,
          externalId: item.externalId,
          name: item.name,
          nameEn: item.nameEn,
          number: item.number,
          imageSmallUrl: item.imageSmallUrl,
          priceRaw: item.priceRaw,
          quantity: 1,
        },
      ];
    });
  }, []);

  const setQuantity = React.useCallback((catalogItemId: string, quantity: number) => {
    setItems((prev) => prev.map((i) => (i.catalogItemId === catalogItemId ? { ...i, quantity } : i)));
  }, []);

  const remove = React.useCallback((catalogItemId: string) => {
    setItems((prev) => prev.filter((i) => i.catalogItemId !== catalogItemId));
  }, []);

  return { items, add, setQuantity, remove, setItems };
}

export default function TradeAnalyzerPage() {
  const sideA = useTradeSide();
  const sideB = useTradeSide();

  const totalA = sideA.items.reduce((sum, i) => sum + (i.priceRaw ?? 0) * i.quantity, 0);
  const totalB = sideB.items.reduce((sum, i) => sum + (i.priceRaw ?? 0) * i.quantity, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="mb-1 text-lg font-semibold">Trade Analyzer</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Add what each side is offering — we&apos;ll total up real market values and tell you if it&apos;s
        a fair deal.
      </p>

      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-stretch">
        <SideSelector
          label="Your side"
          items={sideA.items}
          onAdd={sideA.add}
          onSetQuantity={sideA.setQuantity}
          onRemove={sideA.remove}
        />
        <div className="flex items-center justify-center md:px-2">
          <button
            type="button"
            aria-label="Swap sides"
            onClick={() => {
              const a = sideA.items;
              sideA.setItems(sideB.items);
              sideB.setItems(a);
            }}
            className="rounded-full border border-border bg-surface p-2 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
          >
            <ArrowLeftRight className="size-4" />
          </button>
        </div>
        <SideSelector
          label="Their side"
          items={sideB.items}
          onAdd={sideB.add}
          onSetQuantity={sideB.setQuantity}
          onRemove={sideB.remove}
        />
      </div>

      <FairnessMeter totalA={totalA} totalB={totalB} />
    </div>
  );
}
