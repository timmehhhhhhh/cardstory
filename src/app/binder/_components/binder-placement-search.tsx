"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CardImage } from "@/components/cards/card-image";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { useBinderStore } from "@/lib/binder/store";
import { useBinderCatalogItems } from "@/hooks/use-binder-catalog-items";
import { matchesNameNumberQuery } from "@/lib/utils/name-match";
import type { BinderPocketRef } from "@/lib/binder/types";
import type { EnrichedHolding } from "@/lib/pc/selectors";

/** Where a search hit landed — enough for BinderClient to switch binders/pages and highlight the pocket. */
export interface PlacementJumpTarget {
  binderId: string;
  pageId: string;
  slotIndex: number;
}

interface Placement {
  binderId: string;
  binderName: string;
  pageId: string;
  pageNumber: number;
  slotIndex: number;
  name: string;
  nameEn: string | null;
  number: string | null;
  imageUrl: string | null;
}

const MAX_RESULTS = 50;

/**
 * Locates where a card has been placed across ALL of the user's binders —
 * distinct from the unrelated global nav search (search-box.tsx, which just
 * redirects to /explore). Runs entirely client-side over `binders`, already
 * fully loaded (every page/pocket) via useBinderStore — no new endpoint.
 *
 * Custom images are excluded: they have no name/number to search by
 * (resolvePocketCard gives every one the same fixed "Custom image" label).
 *
 * Known scope limitation: a "holding" pocket only resolves a name when the
 * binder page's holding belongs to the currently-selected "Cards from" pc —
 * the same pre-existing scoping binder-page-view.tsx's resolvePocketCard
 * already has (a holding placed under a different pc silently renders as an
 * empty pocket today, and is equally unresolvable here).
 */
export function BinderPlacementSearch({
  cardsById,
  onJump,
}: {
  /** pc-scoped holdings lookup, passed down from BinderClient (see usePCData(pcIdOverride)). */
  cardsById: Map<string, EnrichedHolding>;
  onJump: (target: PlacementJumpTarget) => void;
}) {
  const binders = useBinderStore((s) => s.binders);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);

  // Separate from BinderClient's active-binder-scoped catalogItemsById (used
  // for rendering) — this one spans every binder's "not owned" placements so
  // search can resolve them too. Some duplicate fetching between the two is
  // an accepted tradeoff for not touching the render path.
  const allCatalogItemIds = React.useMemo(
    () =>
      binders
        .flatMap((b) => b.pages)
        .flatMap((p) => p.pockets)
        .filter((ref): ref is Extract<BinderPocketRef, { kind: "catalog" }> => ref?.kind === "catalog")
        .map((ref) => ref.catalogItemId),
    [binders]
  );
  const { itemsById: allCatalogItemsById } = useBinderCatalogItems(allCatalogItemIds);

  const placements = React.useMemo(() => {
    const list: Placement[] = [];
    for (const b of binders) {
      b.pages.forEach((page, pageIdx) => {
        page.pockets.forEach((ref, slotIndex) => {
          if (!ref || ref.kind === "custom" || ref.kind === "custom-covered") return;
          if (ref.kind === "holding") {
            const holding = cardsById.get(ref.holdingId);
            if (!holding) return;
            list.push({
              binderId: b.id,
              binderName: b.name,
              pageId: page.id,
              pageNumber: pageIdx + 1,
              slotIndex,
              name: holding.display.name,
              nameEn: holding.display.nameEn,
              number: holding.display.number,
              imageUrl: holding.display.imageUrl,
            });
            return;
          }
          const item = allCatalogItemsById.get(ref.catalogItemId);
          if (!item) return;
          list.push({
            binderId: b.id,
            binderName: b.name,
            pageId: page.id,
            pageNumber: pageIdx + 1,
            slotIndex,
            name: item.name,
            nameEn: item.nameEn,
            number: item.number,
            imageUrl: item.imageSmallUrl,
          });
        });
      });
    }
    return list;
  }, [binders, cardsById, allCatalogItemsById]);

  const q = query.trim();
  const results = React.useMemo(() => {
    if (!q) return [];
    return placements
      .filter((p) => matchesNameNumberQuery(q, { name: p.name, nameEn: p.nameEn, number: p.number }))
      .slice(0, MAX_RESULTS);
  }, [placements, q]);

  function handlePick(placement: Placement) {
    onJump({ binderId: placement.binderId, pageId: placement.pageId, slotIndex: placement.slotIndex });
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder="Find where a card has been placed…"
          className="bg-background pl-8 sm:max-w-xs"
        />
      </div>

      {open && q && (
        <div className="absolute top-full left-0 z-30 mt-1 max-h-80 w-full min-w-72 overflow-y-auto rounded-lg border border-border bg-surface-elevated p-1 shadow-lg sm:w-auto">
          {results.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">No placed cards match.</p>
          ) : (
            results.map((r) => (
              <button
                key={`${r.binderId}:${r.pageId}:${r.slotIndex}`}
                type="button"
                // onBlur above fires before this click's onClick — run on
                // mousedown instead so the dropdown doesn't close first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePick(r);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface"
              >
                <div className="relative h-12 w-9 flex-none overflow-hidden rounded bg-muted">
                  <CardImage src={r.imageUrl} alt="" className="object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 truncate text-sm font-medium">{r.name}</p>
                    <CardNumberBadge number={r.number} className="flex-none" />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.binderName} · Page {r.pageNumber}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
