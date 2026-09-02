"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import type { EnrichedHolding } from "@/lib/pc/selectors";
import type { CatalogSearchItem } from "@/lib/catalog/search";
import type { BinderPage, BinderPocketRef } from "@/lib/binder/types";
import { CardImage } from "@/components/cards/card-image";
import { matchesNameNumberQuery } from "@/lib/utils/name-match";
import { CustomImageTab } from "@/app/binder/_components/custom-image-upload";
import type { PlaceCustomImageResult } from "@/lib/binder/store";

interface CatalogSearchResponse {
  items: CatalogSearchItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Debounced (~300ms) catalog search scoped to cards the binder's current pc doesn't already own — same excludeIds pattern as Explore's "not owned" status filter (src/app/explore/_components/explore-client.tsx). */
function NotOwnedTab({
  ownedCatalogItemIds,
  onPick,
}: {
  ownedCatalogItemIds: Set<string>;
  onPick: (ref: BinderPocketRef) => void;
}) {
  const [qDraft, setQDraft] = React.useState("");
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setQ(qDraft), 300);
    return () => clearTimeout(t);
  }, [qDraft]);

  const excludeIds = [...ownedCatalogItemIds].sort();

  const query = useQuery<CatalogSearchResponse>({
    queryKey: ["binder-not-owned-search", q, excludeIds],
    queryFn: async () => {
      const sp = new URLSearchParams({ pageSize: "25" });
      if (q.trim()) sp.set("q", q.trim());
      if (excludeIds.length > 0) sp.set("excludeIds", excludeIds.join(","));
      const res = await fetch(`/api/catalog/search?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to search the catalog");
      return (await res.json()) as CatalogSearchResponse;
    },
  });

  const items = query.data?.items ?? [];

  return (
    <>
      <div className="px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Search the full catalog…"
            className="bg-background pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {query.isLoading ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">Searching…</p>
        ) : items.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            {q.trim() ? "No cards match your search." : "Search for a card you don't own yet."}
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick({ kind: "catalog", catalogItemId: item.id })}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-elevated"
              >
                <div className="relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
                  <CardImage src={item.imageSmallUrl} alt="" className="object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 truncate text-sm font-medium">{item.name}</p>
                    <CardNumberBadge number={item.number} className="flex-none" />
                  </div>
                  {item.nameEn && <p className="truncate text-xs text-muted-foreground">{item.nameEn}</p>}
                  <p className="truncate text-xs text-muted-foreground">{item.setName}</p>
                </div>
                <Badge variant="destructive" className="flex-none">
                  Not owned
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function CardPickerSheet({
  open,
  onOpenChange,
  rows,
  usedCounts,
  ownedCatalogItemIds,
  onPick,
  targetPage,
  layoutCols,
  layoutRows,
  anchorSlotIndex,
  onPlaceCustomImage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: EnrichedHolding[];
  usedCounts: Map<string, number>;
  /** catalogItemIds already owned via this binder's card source — excluded from the "Not Owned" tab's results. */
  ownedCatalogItemIds: Set<string>;
  onPick: (ref: BinderPocketRef) => void;
  /** The page/pocket the "Custom Image" tab is placing into — undefined hides that tab (e.g. before a pocket is selected). */
  targetPage?: BinderPage;
  layoutCols?: number;
  layoutRows?: number;
  anchorSlotIndex?: number;
  onPlaceCustomImage?: (dataUrl: string, spanCols: number, spanRows: number) => PlaceCustomImageResult;
}) {
  // Ternary (rather than a separate boolean) so TS narrows every field together — spreading a `canPlaceCustom`
  // flag wouldn't carry the non-undefined-ness of each prop through to where it's actually used below.
  const customTarget =
    targetPage && layoutCols != null && layoutRows != null && anchorSlotIndex != null && onPlaceCustomImage
      ? { page: targetPage, cols: layoutCols, rows: layoutRows, anchorSlotIndex, onPlace: onPlaceCustomImage }
      : null;
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        matchesNameNumberQuery(q, { name: r.display.name, nameEn: r.display.nameEn, number: r.display.number }) ||
        r.display.subtitle.toLowerCase().includes(q.toLowerCase())
    );
  }, [rows, query]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-surface border-border">
        <SheetHeader>
          <SheetTitle>Choose a card</SheetTitle>
          <SheetDescription>Pick a card to slot into this pocket.</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="collection" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="px-4">
            <TabsList className="w-full">
              <TabsTrigger value="collection" className="flex-1">
                My Collection
              </TabsTrigger>
              <TabsTrigger value="not-owned" className="flex-1">
                Not Owned
              </TabsTrigger>
              {customTarget && (
                <TabsTrigger value="custom" className="flex-1">
                  Custom Image
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="collection" className="flex min-h-0 flex-1 flex-col gap-0">
            <div className="px-4">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
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
                        onClick={() => onPick({ kind: "holding", holdingId: r.id })}
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
                          {r.display.nameEn && (
                            <p className="truncate text-xs text-muted-foreground">{r.display.nameEn}</p>
                          )}
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
          </TabsContent>

          <TabsContent value="not-owned" className="flex min-h-0 flex-1 flex-col gap-0">
            <NotOwnedTab ownedCatalogItemIds={ownedCatalogItemIds} onPick={onPick} />
          </TabsContent>

          {customTarget && (
            <TabsContent value="custom" className="flex min-h-0 flex-1 flex-col gap-0">
              <CustomImageTab
                page={customTarget.page}
                cols={customTarget.cols}
                rows={customTarget.rows}
                anchorSlotIndex={customTarget.anchorSlotIndex}
                onPlace={customTarget.onPlace}
              />
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
