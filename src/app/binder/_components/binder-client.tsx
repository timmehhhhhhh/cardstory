"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePCData } from "@/hooks/use-pc-data";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useBinderCatalogItems } from "@/hooks/use-binder-catalog-items";
import { useBinderStore } from "@/lib/binder/store";
import {
  BINDER_COVER_COLORS,
  BINDER_LAYOUTS,
  coverColorValue,
  type BinderPocketRef,
  type PocketRef,
} from "@/lib/binder/types";
import { PCSelector } from "@/app/pc/_components/pc-selector";
import { BinderSelector } from "@/app/binder/_components/binder-selector";
import { LayoutPicker } from "@/app/binder/_components/layout-picker";
import { BinderSpread, type VisiblePage } from "@/app/binder/_components/binder-spread";
import { BinderPageNav } from "@/app/binder/_components/binder-page-nav";
import { BinderCardList } from "@/app/binder/_components/binder-card-list";
import { CardPickerSheet } from "@/app/binder/_components/card-picker-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function BinderClient({
  pcIdOverride,
  showPcSelector = true,
  backHref = "/pc",
  backLabel = "Back to PC",
  heading = "Binder Planner",
}: {
  /** Scope this binder's card source to a specific pc (e.g. the Business Inventory pc) instead of the globally active one. */
  pcIdOverride?: string;
  /** Hide the "Cards from" pc switcher — set false when pcIdOverride makes it a single fixed source. */
  showPcSelector?: boolean;
  backHref?: string;
  backLabel?: string;
  /** Page heading — overridden by callers (e.g. Business Inventory) that need distinct copy. */
  heading?: string;
}) {
  const { rows } = usePCData(pcIdOverride);

  const binders = useBinderStore((s) => s.binders);
  const activeBinderId = useBinderStore((s) => s.activeBinderId);
  const binder = binders.find((b) => b.id === activeBinderId) ?? binders[0];
  const setLayout = useBinderStore((s) => s.setLayout);
  const setCoverColor = useBinderStore((s) => s.setCoverColor);
  const addPage = useBinderStore((s) => s.addPage);
  const removePage = useBinderStore((s) => s.removePage);
  const placeCard = useBinderStore((s) => s.placeCard);
  const showNumberTags = useBinderStore((s) => s.showNumberTags);
  const setShowNumberTags = useBinderStore((s) => s.setShowNumberTags);
  const showNotOwnedTags = useBinderStore((s) => s.showNotOwnedTags);
  const setShowNotOwnedTags = useBinderStore((s) => s.setShowNotOwnedTags);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const step: 1 | 2 = isDesktop ? 2 : 1;

  const [cursor, setCursor] = React.useState(0);
  const [selectedPocket, setSelectedPocket] = React.useState<PocketRef | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [dragSource, setDragSource] = React.useState<PocketRef | null>(null);
  const [dragOverPocket, setDragOverPocket] = React.useState<PocketRef | null>(null);
  const [layoutMenuOpen, setLayoutMenuOpen] = React.useState(false);

  const pageCount = binder.pages.length;

  // Reset view state when switching binders, and re-clamp `cursor` into
  // range whenever the page count or spread width (`step`) changes — e.g.
  // after a layout reflow or crossing the desktop breakpoint. Both are
  // adjusted during render rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect (same pattern as
  // PCClient's active-pc reset).
  const [prevBinderId, setPrevBinderId] = React.useState(activeBinderId);
  const clampKey = `${step}:${pageCount}`;
  const [prevClampKey, setPrevClampKey] = React.useState(clampKey);
  if (activeBinderId !== prevBinderId) {
    setPrevBinderId(activeBinderId);
    setPrevClampKey(clampKey);
    setCursor(0);
    setSelectedPocket(null);
    setPickerOpen(false);
  } else if (clampKey !== prevClampKey) {
    setPrevClampKey(clampKey);
    const max = Math.max(0, pageCount - step);
    let next = Math.min(cursor, max);
    if (step === 2) next -= next % 2;
    next = Math.max(0, next);
    if (next !== cursor) setCursor(next);
  }

  const layout = BINDER_LAYOUTS[binder.layoutId];

  const visiblePages: VisiblePage[] = React.useMemo(() => {
    const slice = binder.pages.slice(cursor, cursor + step);
    // A lone trailing page (odd page count on desktop) reads as a single
    // page, not a left-hand page missing its partner.
    return slice.map((page, i) => ({
      page,
      pageNumber: cursor + i + 1,
      side: slice.length === 1 ? "single" : i === 0 ? "left" : "right",
    }));
  }, [binder.pages, cursor, step]);

  const cardsById = React.useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const ownedCatalogItemIds = React.useMemo(
    () => new Set(rows.map((r) => r.catalogItemId).filter((id): id is string => !!id)),
    [rows]
  );

  const catalogItemIdsInBinder = React.useMemo(
    () =>
      binder.pages.flatMap((page) =>
        page.pockets.filter((ref): ref is Extract<BinderPocketRef, { kind: "catalog" }> => ref?.kind === "catalog")
          .map((ref) => ref.catalogItemId)
      ),
    [binder.pages]
  );
  const { itemsById: catalogItemsById } = useBinderCatalogItems(catalogItemIdsInBinder);

  const usedCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const page of binder.pages) {
      page.pockets.forEach((ref, slotIndex) => {
        if (!ref || ref.kind !== "holding") return;
        if (selectedPocket?.pageId === page.id && selectedPocket.slotIndex === slotIndex) return;
        map.set(ref.holdingId, (map.get(ref.holdingId) ?? 0) + 1);
      });
    }
    return map;
  }, [binder.pages, selectedPocket]);

  function findNextEmptyPocket(from: PocketRef): PocketRef | null {
    const pageIdx = binder.pages.findIndex((p) => p.id === from.pageId);
    if (pageIdx === -1) return null;
    const currentPage = binder.pages[pageIdx];
    for (let s = from.slotIndex + 1; s < currentPage.pockets.length; s++) {
      if (currentPage.pockets[s] == null) return { pageId: currentPage.id, slotIndex: s };
    }
    for (let p = pageIdx + 1; p < binder.pages.length; p++) {
      const pg = binder.pages[p];
      const s = pg.pockets.findIndex((h) => h == null);
      if (s !== -1) return { pageId: pg.id, slotIndex: s };
    }
    return null;
  }

  function ensureVisible(ref: PocketRef) {
    const idx = binder.pages.findIndex((p) => p.id === ref.pageId);
    if (idx === -1) return;
    if (idx < cursor || idx >= cursor + step) {
      setCursor(step === 2 ? idx - (idx % 2) : idx);
    }
  }

  function handleSelectPocket(pageId: string, slotIndex: number) {
    setSelectedPocket({ pageId, slotIndex });
    setPickerOpen(true);
  }

  function handleClearPocket(pageId: string, slotIndex: number) {
    placeCard(binder.id, pageId, slotIndex, null);
    if (selectedPocket?.pageId === pageId && selectedPocket.slotIndex === slotIndex) {
      setSelectedPocket(null);
    }
  }

  function handlePick(ref: BinderPocketRef) {
    if (!selectedPocket) return;
    placeCard(binder.id, selectedPocket.pageId, selectedPocket.slotIndex, ref);
    const next = findNextEmptyPocket(selectedPocket);
    if (next) {
      setSelectedPocket(next);
      ensureVisible(next);
    } else {
      setSelectedPocket(null);
      setPickerOpen(false);
    }
  }

  function handleRemovePage(pageId: string) {
    const page = binder.pages.find((p) => p.id === pageId);
    const hasCards = page?.pockets.some((h) => h != null);
    if (
      hasCards &&
      !window.confirm(
        "This page has cards placed. Remove it anyway? Your cards stay in your PC — only this binder arrangement is lost."
      )
    ) {
      return;
    }
    removePage(binder.id, pageId);
    if (selectedPocket?.pageId === pageId) {
      setSelectedPocket(null);
      setPickerOpen(false);
    }
  }

  function handleDrop(pageId: string, slotIndex: number) {
    if (!dragSource) return;
    if (dragSource.pageId === pageId && dragSource.slotIndex === slotIndex) {
      setDragSource(null);
      setDragOverPocket(null);
      return;
    }
    const sourcePage = binder.pages.find((p) => p.id === dragSource.pageId);
    const targetPage = binder.pages.find((p) => p.id === pageId);
    const sourceHolding = sourcePage?.pockets[dragSource.slotIndex] ?? null;
    const targetHolding = targetPage?.pockets[slotIndex] ?? null;
    placeCard(binder.id, pageId, slotIndex, sourceHolding);
    placeCard(binder.id, dragSource.pageId, dragSource.slotIndex, targetHolding);
    setDragSource(null);
    setDragOverPocket(null);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3">
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {backLabel}
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-semibold">{heading}</h1>
            <p className="text-sm text-muted-foreground">
              Mock up how your cards would look in a physical binder page.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BinderSelector />
            <Button asChild variant="outline" size="sm">
              <Link href={`/binder/import?binderId=${binder.id}`}>
                <Camera className="size-4" /> Import Physical Binder
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
          {showPcSelector && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Cards from</span>
                <PCSelector />
              </div>

              <div className="h-4 w-px bg-border" />
            </>
          )}

          <DropdownMenu open={layoutMenuOpen} onOpenChange={setLayoutMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-background">
                {layout.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-3" align="start">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Pocket layout</p>
              <LayoutPicker
                value={binder.layoutId}
                onChange={(layoutId) => {
                  setLayout(binder.id, layoutId);
                  setLayoutMenuOpen(false);
                }}
              />
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-border" />

          <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Card numbers</span>
            <Switch size="sm" checked={showNumberTags} onCheckedChange={setShowNumberTags} />
          </label>

          <div className="h-4 w-px bg-border" />

          <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Not owned tags</span>
            <Switch size="sm" checked={showNotOwnedTags} onCheckedChange={setShowNotOwnedTags} />
          </label>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Cover</span>
            {BINDER_COVER_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={`${c.label} cover`}
                aria-pressed={binder.coverColor === c.id}
                onClick={() => setCoverColor(binder.id, c.id)}
                className="flex size-6 items-center justify-center rounded-full ring-1 ring-black/15"
                style={{ background: c.value }}
              >
                {binder.coverColor === c.id && <Check className="size-3.5 text-white/90" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <BinderSpread
        visiblePages={visiblePages}
        coverColor={coverColorValue(binder.coverColor)}
        rows={layout.rows}
        cols={layout.cols}
        cardsById={cardsById}
        catalogItemsById={catalogItemsById}
        selectedPocket={selectedPocket}
        dragSourcePageId={dragSource?.pageId ?? null}
        dragOverPocket={dragOverPocket}
        showNumberTags={showNumberTags}
        showNotOwnedTags={showNotOwnedTags}
        onSelectPocket={handleSelectPocket}
        onClearPocket={handleClearPocket}
        onDragStartSlot={(pageId, slotIndex) => setDragSource({ pageId, slotIndex })}
        onDragOverSlot={(pageId, slotIndex) => setDragOverPocket({ pageId, slotIndex })}
        onDragLeaveSlot={() => setDragOverPocket(null)}
        onDropSlot={handleDrop}
        onDragEndSlot={() => {
          setDragSource(null);
          setDragOverPocket(null);
        }}
        onRemovePage={handleRemovePage}
      />

      <div className="flex justify-center">
        <BinderPageNav
          pages={binder.pages}
          cursor={cursor}
          step={step}
          onJump={setCursor}
          onAddPage={() => {
            addPage(binder.id);
            // The new page lands at index `pageCount` (0-based) since
            // addPage always appends exactly one — jump there immediately
            // rather than waiting a render to detect the length change.
            const lastIdx = pageCount;
            setCursor(step === 2 ? lastIdx - (lastIdx % 2) : lastIdx);
          }}
        />
      </div>

      <p className={cn("text-center text-xs text-muted-foreground", rows.length > 0 && "hidden")}>
        Your pc is empty — add cards from{" "}
        <Link href="/explore" className="text-primary hover:underline">
          Explore
        </Link>{" "}
        first, then come back to fill your binder.
      </p>

      <BinderCardList binder={binder} cols={layout.cols} cardsById={cardsById} catalogItemsById={catalogItemsById} />

      <CardPickerSheet
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          if (!open) setSelectedPocket(null);
        }}
        rows={rows}
        usedCounts={usedCounts}
        ownedCatalogItemIds={ownedCatalogItemIds}
        onPick={handlePick}
      />
    </div>
  );
}
