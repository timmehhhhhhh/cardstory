"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CardTile } from "@/components/cards/card-tile";
import { BusinessModeToggle } from "@/app/explore/_components/business-mode-toggle";
import { QuickAddToggle } from "@/app/explore/_components/quick-add-toggle";
import { Button } from "@/components/ui/button";
import type { CatalogSearchItem } from "@/lib/catalog/search";

/**
 * Renders every catalog row for the resolved set + number (all variations —
 * holo/reverse holo/1st edition/etc. — as separate tappable tiles, same as
 * Explore) via the existing CardTile, unmodified: its Add-to-collection
 * button already respects the Business mode / Quick Add preferences toggled
 * here, so this screen needs no add-to-PC logic of its own. Next Card is
 * always available (not gated on having added anything) — a dead-end
 * dictation shouldn't block getting back to the mic.
 */
export function ResultsStep({
  gameId,
  set,
  numberPart,
  onNextCard,
}: {
  gameId: string;
  set: { id: string; name: string };
  numberPart: string;
  onNextCard: () => void;
}) {
  const query = useQuery<{ items: CatalogSearchItem[] }>({
    queryKey: ["quick-import-results", gameId, set.id, numberPart],
    queryFn: async () => {
      const params = new URLSearchParams({ game: gameId, set: set.id, q: numberPart, pageSize: "24" });
      const res = await fetch(`/api/catalog/search?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  });

  // /api/catalog/search's `q` matches CatalogItem.number/SportsCardItem.
  // cardNumber with a *substring* `contains` (see tcgWhereFor/
  // sportsWhereFor in lib/catalog/search.ts) — fine for Explore's
  // name+number combo queries, where the name half already narrows things
  // down, but on its own a short digit like "1" would also match "11",
  // "31", "41"... every number containing that digit anywhere. Quick
  // Import's numberPart means "this exact number in the set," so prefer an
  // exact match on the raw returned set; only fall back to the broader
  // contains-based set (e.g. a spoken "45" against a stored "045") when
  // nothing matches exactly.
  const items = React.useMemo(() => {
    const all = query.data?.items ?? [];
    const exact = all.filter((item) => item.number?.trim().toLowerCase() === numberPart.trim().toLowerCase());
    return exact.length > 0 ? exact : all;
  }, [query.data, numberPart]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 min-w-0 truncate text-sm text-muted-foreground">
          {set.name} · #{numberPart}
        </p>
        <BusinessModeToggle />
        <QuickAddToggle />
      </div>

      <Button onClick={onNextCard} className="h-11 self-center">
        Next card
        <ArrowRight className="size-4" />
      </Button>

      {query.isLoading && <p className="text-sm text-muted-foreground">Searching…</p>}
      {query.isError && <p className="text-sm text-negative">Search failed. Try Next Card to retry.</p>}

      {!query.isLoading && !query.isError && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No cards found for {set.name} #{numberPart}.
          </p>
          <Button variant="outline" onClick={onNextCard}>
            <ArrowLeft className="size-4" />
            Try again
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <CardTile key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
