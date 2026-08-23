"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDeckData } from "@/hooks/use-deck-data";
import { useDeckCraftingStore } from "@/lib/deck-crafting/store";
import { DeckSectionZone } from "@/app/deck-crafting/[deckId]/_components/deck-section-zone";
import { DeckLegalityPanel } from "@/app/deck-crafting/[deckId]/_components/deck-legality-panel";
import { getGameMeta } from "@/lib/games/registry";

export function DeckEditorClient({ deckId }: { deckId: string }) {
  const { deck, format, validation, catalogItemsById, ownedQuantities } = useDeckData(deckId);
  const renameDeck = useDeckCraftingStore((s) => s.renameDeck);
  const setDeckStatus = useDeckCraftingStore((s) => s.setDeckStatus);

  const [renaming, setRenaming] = React.useState(false);
  const [name, setName] = React.useState("");

  function openRename() {
    if (!deck) return;
    setName(deck.name);
    setRenaming(true);
  }

  if (!deck) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-muted-foreground">Deck not found.</p>
        <Link href="/deck-crafting" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to Deck Crafting
        </Link>
      </div>
    );
  }

  if (!format) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-destructive">Unknown format &quot;{deck.formatId}&quot; for this deck.</p>
      </div>
    );
  }

  const game = getGameMeta(deck.gameId);

  function handleRenameSave() {
    const trimmed = name.trim();
    if (trimmed && deck) renameDeck(deck.id, trimmed);
    setRenaming(false);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <Link
          href="/deck-crafting"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Deck Crafting
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {renaming ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRenameSave()}
                  className="h-9 bg-background text-xl font-semibold"
                />
                <Button size="icon" variant="ghost" onClick={handleRenameSave} aria-label="Save name">
                  <Check className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="font-heading truncate text-xl font-semibold">{deck.name}</h1>
                <Button size="icon" variant="ghost" onClick={openRename} aria-label="Rename deck">
                  <Pencil className="size-3.5" />
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {game?.name ?? deck.gameId} · {format.label}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setDeckStatus(deck.id, deck.status === "complete" ? "wip" : "complete")}
          >
            <Badge variant={deck.status === "complete" ? "secondary" : "outline"}>
              {deck.status === "complete" ? "Complete" : "WIP"}
            </Badge>
            Mark as {deck.status === "complete" ? "WIP" : "Complete"}
          </Button>
        </div>
      </div>

      {validation && <DeckLegalityPanel validation={validation} format={format} />}

      <div className="grid gap-4 sm:grid-cols-2">
        {format.sections.map((section) => (
          <DeckSectionZone
            key={section.id}
            deck={deck}
            section={section}
            result={validation?.sections.find((s) => s.section.id === section.id)}
            catalogItemsById={catalogItemsById}
            ownedQuantities={ownedQuantities}
          />
        ))}
      </div>
    </div>
  );
}
