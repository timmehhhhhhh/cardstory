"use client";

import * as React from "react";
import Link from "next/link";
import { GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeckCraftingStore } from "@/lib/deck-crafting/store";
import { NewDeckDialog } from "@/app/deck-crafting/_components/new-deck-dialog";
import { getFormat } from "@/lib/deck-crafting/formats";
import { getGameMeta } from "@/lib/games/registry";
import { cn } from "@/lib/utils";
import type { Deck } from "@/lib/deck-crafting/types";

export function DeckCraftingClient() {
  const decks = useDeckCraftingStore((s) => s.decks);
  const reorderDecks = useDeckCraftingStore((s) => s.reorderDecks);
  const renameDeck = useDeckCraftingStore((s) => s.renameDeck);
  const deleteDeck = useDeckCraftingStore((s) => s.deleteDeck);

  const [creating, setCreating] = React.useState(false);
  const [renamingDeck, setRenamingDeck] = React.useState<Deck | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  const sorted = React.useMemo(() => [...decks].sort((a, b) => a.sortOrder - b.sortOrder), [decks]);

  const dragId = React.useRef<string | null>(null);

  function handleDrop(targetId: string) {
    const sourceId = dragId.current;
    dragId.current = null;
    if (!sourceId || sourceId === targetId) return;
    const ids = sorted.map((d) => d.id);
    const fromIdx = ids.indexOf(sourceId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, sourceId);
    reorderDecks(ids);
  }

  function openRename(deck: Deck) {
    setRenamingDeck(deck);
    setRenameValue(deck.name);
  }

  function handleRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || !renamingDeck) return;
    renameDeck(renamingDeck.id, trimmed);
    setRenamingDeck(null);
  }

  function handleDelete(deck: Deck) {
    if (!window.confirm(`Delete "${deck.name}"? This can't be undone.`)) return;
    deleteDeck(deck.id);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Deck Crafting</h1>
          <p className="text-sm text-muted-foreground">
            Build tournament-legal decks from cards you own, topped up from Explore.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New Deck
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">No decks yet — start your first build.</p>
          <Button className="mt-4" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New Deck
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((deck) => {
            const format = getFormat(deck.formatId);
            const game = getGameMeta(deck.gameId);
            const cardCount = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
            return (
              <div
                key={deck.id}
                draggable
                onDragStart={() => (dragId.current = deck.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(deck.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-elevated"
                )}
              >
                <GripVertical className="size-4 flex-none cursor-grab text-muted-foreground" />
                <Link href={`/deck-crafting/${deck.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{deck.name}</p>
                    <Badge variant={deck.status === "complete" ? "secondary" : "outline"} className="flex-none">
                      {deck.status === "complete" ? "Complete" : "WIP"}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {game?.name ?? deck.gameId} · {format?.label ?? deck.formatId} · {cardCount} card
                    {cardCount === 1 ? "" : "s"}
                  </p>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Deck options">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => openRename(deck)}>
                      <Pencil className="size-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(deck)}>
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      <NewDeckDialog open={creating} onOpenChange={setCreating} />

      <Dialog open={renamingDeck != null} onOpenChange={(open) => !open && setRenamingDeck(null)}>
        <DialogContent className="bg-surface border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename deck</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="bg-background"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingDeck(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
