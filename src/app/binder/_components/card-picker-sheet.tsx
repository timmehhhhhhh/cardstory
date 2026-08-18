"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import type { EnrichedHolding } from "@/lib/pc/selectors";
import { CardImage } from "@/components/cards/card-image";

export function CardPickerSheet({
  open,
  onOpenChange,
  rows,
  usedCounts,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: EnrichedHolding[];
  usedCounts: Map<string, number>;
  onPick: (holdingId: string) => void;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.display.name.toLowerCase().includes(q) || r.display.subtitle.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-surface border-border">
        <SheetHeader>
          <SheetTitle>Choose a card</SheetTitle>
          <SheetDescription>Pick a card to slot into this pocket.</SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your collection…"
              className="bg-background pl-8"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {filtered.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              {rows.length === 0 ? "Add cards to your PC first." : "No cards match your search."}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((r) => {
                const used = usedCounts.get(r.id) ?? 0;
                const remaining = r.quantity - used;
                const disabled = remaining <= 0;
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(r.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                      disabled ? "cursor-not-allowed opacity-40" : "hover:bg-surface-elevated"
                    )}
                  >
                    <div className="relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
                      <CardImage src={r.display.imageUrl} alt="" className="object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="min-w-0 truncate text-sm font-medium">{r.display.name}</p>
                        <CardNumberBadge number={r.display.number} className="flex-none" />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{r.display.subtitle}</p>
                    </div>
                    <Badge variant={disabled ? "outline" : "secondary"} className="flex-none">
                      {disabled ? "All placed" : `×${remaining} left`}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
