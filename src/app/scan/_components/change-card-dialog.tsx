"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CardImage } from "@/components/cards/card-image";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import type { CatalogSearchItem } from "@/lib/catalog/search";
import type { CandidateMatch } from "@/lib/scanning";

const SEARCH_DEBOUNCE_MS = 300;

function toCandidateMatch(item: CatalogSearchItem): CandidateMatch {
  return {
    catalogItemId: item.id,
    gameId: item.gameId,
    name: item.name,
    setName: item.setName,
    number: item.number,
    imageSmallUrl: item.imageSmallUrl,
    score: 1,
  };
}

/**
 * "Change card" — reuses the existing catalog search API
 * (GET /api/catalog/search, the same backend /explore's grid queries) rather
 * than building a second card-search implementation. Search-as-you-type,
 * debounced; picking a result hands a synthesized CandidateMatch back to the
 * caller (see review-state.ts's setCandidate, which appends it to the
 * card's offered candidates before applying the selection).
 */
export function ChangeCardDialog({
  open,
  onOpenChange,
  initialQuery,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  onSelect: (candidate: CandidateMatch) => void;
}) {
  const [query, setQuery] = React.useState(initialQuery ?? "");
  const [results, setResults] = React.useState<CatalogSearchItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery(initialQuery ?? "");
      setResults([]);
    }
  }

  // Every setState call below runs inside the setTimeout callback (never
  // synchronously in the effect body itself) — matching the debounced-draft
  // pattern src/app/explore/_components/sidebar-filters.tsx already uses,
  // where only the timer setup/teardown runs synchronously and every state
  // update happens once the timer actually fires.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const trimmed = query.trim();
      if (!trimmed) {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setLoading(true);
      fetch(`/api/catalog/search?q=${encodeURIComponent(trimmed)}&pageSize=20`)
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((data: { items: CatalogSearchItem[] }) => {
          if (!cancelled) setResults(data.items);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change card</DialogTitle>
          <DialogDescription>Search the catalog for the right card.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by card name…"
            className="bg-background pl-8"
          />
        </div>

        <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No matches.</p>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onSelect(toCandidateMatch(r));
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:border-primary/40 hover:bg-surface-elevated"
              >
                <div className="relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
                  <CardImage src={r.imageSmallUrl} alt="" className="object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 truncate text-sm font-medium">{r.name}</p>
                    <CardNumberBadge number={r.number} className="flex-none" />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{r.setName}</p>
                </div>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
