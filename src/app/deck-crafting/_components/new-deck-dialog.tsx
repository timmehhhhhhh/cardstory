"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDeckCraftingStore } from "@/lib/deck-crafting/store";
import { getDeckCraftingGameIds, getFormatsForGame } from "@/lib/deck-crafting/formats";
import { getGameMeta } from "@/lib/games/registry";

type Step = "game" | "format" | "name";

export function NewDeckDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const createDeck = useDeckCraftingStore((s) => s.createDeck);

  const [step, setStep] = React.useState<Step>("game");
  const [gameId, setGameId] = React.useState<string | null>(null);
  const [formatId, setFormatId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");

  function handleOpenChange(next: boolean) {
    if (next) {
      setStep("game");
      setGameId(null);
      setFormatId(null);
      setName("");
    }
    onOpenChange(next);
  }

  const games = React.useMemo(
    () => getDeckCraftingGameIds().map((id) => getGameMeta(id)).filter((g): g is NonNullable<typeof g> => g != null),
    []
  );
  const formats = gameId ? getFormatsForGame(gameId) : [];

  function pickGame(id: string) {
    setGameId(id);
    const formatsForGame = getFormatsForGame(id);
    if (formatsForGame.length === 1) {
      setFormatId(formatsForGame[0].id);
      setStep("name");
    } else {
      setStep("format");
    }
  }

  function pickFormat(id: string) {
    setFormatId(id);
    setStep("name");
  }

  function handleCreate() {
    if (!gameId || !formatId) return;
    const trimmed = name.trim() || "Untitled Deck";
    const deckId = createDeck(trimmed, gameId, formatId);
    onOpenChange(false);
    router.push(`/deck-crafting/${deckId}`);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "game" && "New deck — choose a game"}
            {step === "format" && "New deck — choose a format"}
            {step === "name" && "New deck — name it"}
          </DialogTitle>
        </DialogHeader>

        {step === "game" && (
          <div className="flex flex-col gap-1.5">
            {games.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => pickGame(g.id)}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm font-medium hover:bg-surface-elevated"
              >
                {g.name}
                <span className="text-xs text-muted-foreground">{g.shortLabel}</span>
              </button>
            ))}
          </div>
        )}

        {step === "format" && (
          <div className="flex flex-col gap-1.5">
            {formats.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => pickFormat(f.id)}
                className={cn(
                  "flex flex-col gap-0.5 rounded-lg border border-border bg-background px-3 py-2.5 text-left hover:bg-surface-elevated"
                )}
              >
                <span className="text-sm font-medium">{f.label}</span>
                <span className="text-xs text-muted-foreground">{f.description}</span>
              </button>
            ))}
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setStep("game")}>
              Back
            </Button>
          </div>
        )}

        {step === "name" && (
          <div className="flex flex-col gap-3">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mono-Fury Aggro, Rayquaza VMAX"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="bg-background"
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep(formats.length > 1 ? "format" : "game")}
              >
                Back
              </Button>
              <Button onClick={handleCreate}>Create deck</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
