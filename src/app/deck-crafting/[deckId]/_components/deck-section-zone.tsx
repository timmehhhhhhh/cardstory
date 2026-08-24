"use client";

import * as React from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/cards/card-image";
import { cn } from "@/lib/utils";
import { useDeckCraftingStore } from "@/lib/deck-crafting/store";
import { DeckCardPickerSheet } from "@/app/deck-crafting/[deckId]/_components/deck-card-picker-sheet";
import type { DeckSection } from "@/lib/deck-crafting/formats";
import type { SectionResult } from "@/lib/deck-crafting/validate";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";
import type { Deck } from "@/lib/deck-crafting/types";

export function DeckSectionZone({
  deck,
  section,
  result,
  catalogItemsById,
  ownedQuantities,
}: {
  deck: Deck;
  section: DeckSection;
  result: SectionResult | undefined;
  catalogItemsById: Map<string, CatalogItemDetail>;
  ownedQuantities: Map<string, number>;
}) {
  const addCard = useDeckCraftingStore((s) => s.addCard);
  const updateCardQuantity = useDeckCraftingStore((s) => s.updateCardQuantity);
  const removeCard = useDeckCraftingStore((s) => s.removeCard);

  const [pickerOpen, setPickerOpen] = React.useState(false);

  const cardsInSection = deck.cards.filter((c) => c.section === section.id);
  const count = result?.count ?? 0;
  const limitLabel = section.max === null ? `${count}` : `${count}/${section.max}`;
  const ok = result?.ok ?? true;

  // Keep the picker open across multiple picks (users often add many cards
  // in a row) — only auto-close once the section hits its max. Sections
  // with no max stay open until the user cancels/dismisses manually.
  React.useEffect(() => {
    if (pickerOpen && section.max !== null && count >= section.max) {
      setPickerOpen(false);
    }
  }, [pickerOpen, count, section.max]);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-sm font-semibold">{section.label}</h2>
          <p className={cn("text-xs", ok ? "text-muted-foreground" : "text-destructive")}>
            {limitLabel} {section.min > 0 ? `· min ${section.min}` : ""}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {cardsInSection.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {cardsInSection.map((card) => {
            const item = catalogItemsById.get(card.catalogItemId);
            const owned = (ownedQuantities.get(card.catalogItemId) ?? 0) >= card.quantity;
            return (
              <div key={card.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-elevated">
                <div className="relative h-12 w-9 flex-none overflow-hidden rounded bg-muted">
                  <CardImage src={item?.imageSmallUrl ?? null} alt="" className="object-contain" />
                  {!owned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <span className="rotate-[-20deg] text-[7px] font-bold tracking-wide text-destructive uppercase">
                        Not Owned
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item?.name ?? card.catalogItemId}</p>
                  {!owned && (
                    <Badge variant="destructive" className="mt-0.5">
                      Not owned
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    onClick={() => updateCardQuantity(deck.id, card.id, card.quantity - 1)}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-4 text-center text-sm tabular-nums">{card.quantity}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    onClick={() => updateCardQuantity(deck.id, card.id, card.quantity + 1)}
                  >
                    <Plus className="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    aria-label="Remove"
                    onClick={() => removeCard(deck.id, card.id)}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DeckCardPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        gameId={deck.gameId}
        section={section}
        onPick={(catalogItemId) => {
          addCard(deck.id, section.id, catalogItemId, 1);
        }}
      />
    </div>
  );
}
