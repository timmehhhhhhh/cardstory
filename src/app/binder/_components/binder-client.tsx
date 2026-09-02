"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Camera, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePCData } from "@/hooks/use-pc-data";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useBinderCatalogItems } from "@/hooks/use-binder-catalog-items";
import { useBinderStore } from "@/lib/binder/store";
import {
  BINDER_COVER_COLORS,
  BINDER_LAYOUTS,
  coverColorValue,
  pocketCount,
  resolvedPageBackgroundColor,
  type Binder,
  type BinderLayoutId,
  type BinderPocketRef,
  type PageBackground,
  type PocketRef,
} from "@/lib/binder/types";
import { bookSpreads, spreadIndexForPage } from "@/lib/binder/spreads";
import { PCSelector } from "@/app/pc/_components/pc-selector";
import { BinderSelector } from "@/app/binder/_components/binder-selector";
import { LayoutPicker } from "@/app/binder/_components/layout-picker";
import { BinderSpread, type VisiblePage } from "@/app/binder/_components/binder-spread";
import { BinderPageNav } from "@/app/binder/_components/binder-page-nav";
import { BinderCardList } from "@/app/binder/_components/binder-card-list";
import { CardPickerSheet } from "@/app/binder/_components/card-picker-sheet";
import { BinderPreview } from "@/app/binder/_components/binder-preview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const PAGE_BACKGROUND_OPTIONS: { id: PageBackground; label: string }[] = [
  { id: "match-cover", label: "Match binder" },
  { id: "black", label: "Black" },
  { id: "white", label: "White" },
];

/**
 * Stand-in rendered for the brief window before GET /api/binder resolves
 * (binders is server-fetched now, so it's `[]` on first paint instead of
 * always having the local store's synchronous default). A stable
 * module-level constant — not recreated per render — so it's safe to sit
 * in useMemo dependency arrays below without invalidating them every
 * render. The server always ensures a real binder exists once loaded, so
 * this is only ever visible for one query round trip.
 */
const EMPTY_BINDER: Binder = {
  id: "",
  name: "",
  layoutId: "9",
  coverColor: "black",
  pageBackground: "match-cover",
  status: "wip",
  pages: [{ id: "", pockets: Array.from({ length: pocketCount("9") }, () => null) }],
  createdAt: "",
  updatedAt: "",
};

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
  const binder = binders.find((b) => b.id === activeBinderId) ?? binders[0] ?? EMPTY_BINDER;
  const setLayout = useBinderStore((s) => s.setLayout);
  const setCoverColor = useBinderStore((s) => s.setCoverColor);
  const setPageBackground = useBinderStore((s) => s.setPageBackground);
  const addPage = useBinderStore((s) => s.addPage);
  const removePage = useBinderStore((s) => s.removePage);
  const placeCard = useBinderStore((s) => s.placeCard);
  const placeCustomImage = useBinderStore((s) => s.placeCustomImage);
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
  const [layoutBlockedMessage, setLayoutBlockedMessage] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const pageCount = binder.pages.length;

  // Book-style spreads: page 1 sits alone against the blank inside front
  // cover, then pages pair up (2&3, 4&5, ...) — same offset a physical
  // binder opens with, shared with the fullscreen Preview (see spreads.ts).
  // On desktop (step === 2) `cursor` indexes into this array (a "spread
  // index"); on mobile (step === 1) it's a plain page-array index, same as
  // before — there's nothing to pair when only one page is shown at a time.
  const spreads = React.useMemo(() => bookSpreads(binder.pages), [binder.pages]);

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
    const maxCursor = step === 2 ? Math.max(0, spreads.length - 1) : Math.max(0, pageCount - 1);
    const next = Math.max(0, Math.min(cursor, maxCursor));
    if (next !== cursor) setCursor(next);
  }

  const layout = BINDER_LAYOUTS[binder.layoutId];

  const visiblePages: VisiblePage[] = React.useMemo(() => {
    if (step === 1) {
      const page = binder.pages[cursor];
      return page ? [{ page, pageNumber: cursor + 1, side: "single" as const }] : [];
    }
    const spread = spreads[cursor] ?? [];
    return spread.map((page, i) => ({
      page,
      pageNumber: page ? binder.pages.findIndex((p) => p.id === page.id) + 1 : null,
      side: (i === 0 ? "left" : "right") as "left" | "right",
    }));
  }, [binder.pages, spreads, cursor, step]);

  const visiblePageNumbers = visiblePages
    .map((vp) => vp.pageNumber)
    .filter((n): n is number => n != null);
  const canGoPrev = cursor > 0;
  const canGoNext = step === 1 ? cursor < pageCount - 1 : cursor < spreads.length - 1;

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
    const target = step === 2 ? spreadIndexForPage(idx) : idx;
    if (target !== cursor) setCursor(target);
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
    // Custom images are repositioned by delete + re-place, not drag — a
    // group spans multiple slots and can't be swapped as one via placeCard.
    // BinderPocket already refuses to make a custom pocket draggable, but
    // guard here too since dragSource/target come from state, not a type.
    if (
      sourceHolding?.kind === "custom" ||
      sourceHolding?.kind === "custom-covered" ||
      targetHolding?.kind === "custom" ||
      targetHolding?.kind === "custom-covered"
    ) {
      setDragSource(null);
      setDragOverPocket(null);
      return;
    }
    placeCard(binder.id, pageId, slotIndex, sourceHolding);
    placeCard(binder.id, dragSource.pageId, dragSource.slotIndex, targetHolding);
    setDragSource(null);
    setDragOverPocket(null);
  }

  function handlePlaceCustomImage(dataUrl: string, spanCols: number, spanRows: number) {
    if (!selectedPocket) return { ok: false as const, reason: "out-of-bounds" as const };
    const result = placeCustomImage(binder.id, selectedPocket.pageId, selectedPocket.slotIndex, dataUrl, spanCols, spanRows);
    if (result.ok) {
      setSelectedPocket(null);
      setPickerOpen(false);
    }
    return result;
  }

  function handleLayoutChange(layoutId: BinderLayoutId) {
    const result = setLayout(binder.id, layoutId);
    if (!result.ok) {
      const pages = result.blockedBy.map((b) => b.pageNumber).join(", ");
      setLayoutBlockedMessage(
        `Remove the custom image${result.blockedBy.length > 1 ? "s" : ""} on page${result.blockedBy.length > 1 ? "s" : ""} ${pages} before shrinking this layout.`
      );
    } else {
      setLayoutBlockedMessage(null);
      setLayoutMenuOpen(false);
    }
  }

  const pageBackground = resolvedPageBackgroundColor(binder.pageBackground, binder.coverColor);
  const selectedPage = selectedPocket ? binder.pages.find((p) => p.id === selectedPocket.pageId) : undefined;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6">
      <div className="flex flex-none flex-col gap-3">
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
          <div className="flex flex-wrap items-center gap-2">
            <BinderSelector />
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <BookOpen className="size-4" /> Preview
            </Button>
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
              <LayoutPicker value={binder.layoutId} onChange={handleLayoutChange} />
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

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Page background</span>
            {PAGE_BACKGROUND_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-label={`${opt.label} page background`}
                aria-pressed={binder.pageBackground === opt.id}
                onClick={() => setPageBackground(binder.id, opt.id)}
                className="flex size-6 items-center justify-center rounded-full ring-1 ring-black/15"
                style={{
                  background:
                    opt.id === "match-cover" ? coverColorValue(binder.coverColor) : opt.id === "black" ? "#0a0a0a" : "#ffffff",
                }}
              >
                {binder.pageBackground === opt.id && (
                  <Check className={cn("size-3.5", opt.id === "white" ? "text-black/70" : "text-white/90")} />
                )}
              </button>
            ))}
          </div>
        </div>

        {layoutBlockedMessage && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{layoutBlockedMessage}</p>
        )}
      </div>

      <BinderSpread
        visiblePages={visiblePages}
        coverColor={coverColorValue(binder.coverColor)}
        pageBackground={pageBackground}
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

      <div className="flex flex-none justify-center">
        <BinderPageNav
          pages={binder.pages}
          visiblePageNumbers={visiblePageNumbers}
          canPrev={canGoPrev}
          canNext={canGoNext}
          onPrev={() => setCursor((c) => Math.max(0, c - 1))}
          onNext={() =>
            setCursor((c) => Math.min(step === 1 ? pageCount - 1 : spreads.length - 1, c + 1))
          }
          onJumpToPage={(pageNumber) => {
            const idx = pageNumber - 1;
            setCursor(step === 2 ? spreadIndexForPage(idx) : idx);
          }}
          onAddPage={() => {
            addPage(binder.id);
            // The new page lands at index `pageCount` (0-based) since
            // addPage always appends exactly one — jump there immediately
            // rather than waiting a render to detect the length change.
            const lastIdx = pageCount;
            setCursor(step === 2 ? spreadIndexForPage(lastIdx) : lastIdx);
          }}
        />
      </div>

      <p className={cn("flex-none text-center text-xs text-muted-foreground", rows.length > 0 && "hidden")}>
        Your pc is empty — add cards from{" "}
        <Link href="/explore" className="text-primary hover:underline">
          Explore
        </Link>{" "}
        first, then come back to fill your binder.
      </p>

      <div className="flex-none">
        <BinderCardList binder={binder} cols={layout.cols} cardsById={cardsById} catalogItemsById={catalogItemsById} />
      </div>

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
        targetPage={selectedPage}
        layoutCols={layout.cols}
        layoutRows={layout.rows}
        anchorSlotIndex={selectedPocket?.slotIndex}
        onPlaceCustomImage={handlePlaceCustomImage}
      />

      <BinderPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        binder={binder}
        layout={layout}
        coverColor={coverColorValue(binder.coverColor)}
        pageBackground={pageBackground}
        cardsById={cardsById}
        catalogItemsById={catalogItemsById}
        showNumberTags={showNumberTags}
        showNotOwnedTags={showNotOwnedTags}
      />
    </div>
  );
}
