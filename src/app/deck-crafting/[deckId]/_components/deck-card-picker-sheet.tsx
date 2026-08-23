"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardImage } from "@/components/cards/card-image";
import { usePCData } from "@/hooks/use-pc-data";
import { cardMatchesSection } from "@/lib/deck-crafting/validate";
import type { DeckSection } from "@/lib/deck-crafting/formats";

interface ExploreSearchItem {
  id: string;
  name: string;
  cardType: string | null;
  imageSmallUrl: string | null;
  setName: string;
}

/**
 * Add-card picker for one deck section — "From PC" (the user's owned
 * cards, filtered to this game + eligible for this section) and "Explore"
 * (the full catalog, same scoping) — mirrors src/app/binder/_components/card-picker-sheet.tsx's
 * layout. Any card picked from Explore that isn't in the user's PC gets the
 * "Not Owned" watermark once placed — see deck-section-zone.tsx.
 */
export function DeckCardPickerSheet({
  open,
  onOpenChange,
  gameId,
  section,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  section: DeckSection;
  onPick: (catalogItemId: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState<"pc" | "explore">("pc");

  const { rows: pcRows } = usePCData();
  const pcCandidates = React.useMemo(
    () =>
      pcRows.filter(
        (r) =>
          r.catalogItem?.gameId === gameId &&
          cardMatchesSection(r.catalogItem?.cardType ?? null, section) &&
          r.quantity > 0
      ),
    [pcRows, gameId, section]
  );
  const filteredPc = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pcCandidates;
    return pcCandidates.filter((r) => r.display.name.toLowerCase().includes(q));
  }, [pcCandidates, query]);

  const exploreQuery = useQuery<{ items: ExploreSearchItem[] }>({
    queryKey: ["deck-crafting-explore", gameId, section.id, query],
    queryFn: async () => {
      const params = new URLSearchParams({ game: gameId, pageSize: "40" });
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/catalog/search?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as { items: ExploreSearchItem[] };
      return { items: data.items ?? [] };
    },
    enabled: open && tab === "explore",
  });
  const exploreCandidates = React.useMemo(
    () => (exploreQuery.data?.items ?? []).filter((i) => cardMatchesSection(i.cardType, section)),
    [exploreQuery.data, section]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-surface border-border">
        <SheetHeader>
          <SheetTitle>Add to {section.label}</SheetTitle>
          <SheetDescription>Pick a card from your PC, or browse Explore.</SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cards…"
              className="bg-background pl-8"
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "pc" | "explore")} className="px-4">
          <TabsList>
            <TabsTrigger value="pc">From PC</TabsTrigger>
            <TabsTrigger value="explore">Explore</TabsTrigger>
          </TabsList>

          <TabsContent value="pc" className="flex-1 overflow-y-auto pb-4">
            {filteredPc.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                No owned cards match this section yet — try Explore.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredPc.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onPick(r.catalogItemId!)}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-elevated"
                  >
                    <div className="relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
                      <CardImage src={r.display.imageUrl} alt="" className="object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.display.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.display.subtitle}</p>
                    </div>
                    <Badge variant="secondary" className="flex-none">
                      ×{r.quantity} owned
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="explore" className="flex-1 overflow-y-auto pb-4">
            {exploreQuery.isLoading ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">Searching…</p>
            ) : exploreCandidates.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                No cards match this section.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {exploreCandidates.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onPick(item.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-elevated"
                    )}
                  >
                    <div className="relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
                      <CardImage src={item.imageSmallUrl} alt="" className="object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.setName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
