"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { containedBoxStyle, containerStyle } from "@/lib/binder/fit-style";
import { BinderPageView } from "@/app/binder/_components/binder-page-view";
import type { Binder, BinderPage } from "@/lib/binder/types";
import type { EnrichedHolding } from "@/lib/pc/selectors";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";

/**
 * [null, page1], [page2, page3], [page4, page5], ... — mirrors how a real
 * book opens: the first page sits alone against the inside front cover (no
 * page 0 to pair with), then every following spread pairs two consecutive
 * pages, same as flipping through a physical binder.
 */
function bookSpreads(pages: BinderPage[]): (BinderPage | null)[][] {
  if (pages.length === 0) return [];
  const spreads: (BinderPage | null)[][] = [[null, pages[0]]];
  for (let i = 1; i < pages.length; i += 2) {
    spreads.push([pages[i], pages[i + 1] ?? null]);
  }
  return spreads;
}

const SWIPE_THRESHOLD_PX = 50;

export function BinderPreview({
  open,
  onOpenChange,
  binder,
  layout,
  coverColor,
  pocketBackground,
  cardsById,
  catalogItemsById,
  showNumberTags,
  showNotOwnedTags,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  binder: Binder;
  layout: { rows: number; cols: number };
  coverColor: string;
  pocketBackground: string;
  cardsById: Map<string, EnrichedHolding>;
  catalogItemsById: Map<string, CatalogItemDetail>;
  showNumberTags: boolean;
  showNotOwnedTags: boolean;
}) {
  const isLandscape = useMediaQuery("(orientation: landscape)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const spreads = React.useMemo(() => bookSpreads(binder.pages), [binder.pages]);
  const pageCount = binder.pages.length;
  const maxIndex = isLandscape ? spreads.length - 1 : pageCount - 1;

  const [index, setIndex] = React.useState(0);
  const [direction, setDirection] = React.useState<1 | -1>(1);
  const touchStartX = React.useRef<number | null>(null);

  // Restart from the front every time the preview is (re)opened — adjusted
  // during render rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect (same pattern as
  // BinderClient's active-binder reset).
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setIndex(0);
  }

  const goNext = React.useCallback(() => {
    setDirection(1);
    setIndex((i) => Math.min(maxIndex, i + 1));
  }, [maxIndex]);

  const goPrev = React.useCallback(() => {
    setDirection(-1);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goNext, goPrev]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx <= -SWIPE_THRESHOLD_PX) goNext();
    else if (dx >= SWIPE_THRESHOLD_PX) goPrev();
  }

  const readOnlyProps = {
    cardsById,
    catalogItemsById,
    selectedPocket: null,
    dragSourcePageId: null,
    dragOverSlot: null,
    showNumberTags,
    showNotOwnedTags,
    background: pocketBackground,
    interactive: false as const,
  };

  const pageAspectRatio = isLandscape ? (layout.cols * 2) / layout.rows : layout.cols / layout.rows;

  const transitionClass = reducedMotion
    ? ""
    : cn(
        "duration-300 animate-in fade-in",
        direction === 1 ? "slide-in-from-right-8" : "slide-in-from-left-8"
      );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black" />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={() => onOpenChange(false)}
          className="fixed inset-0 z-50 flex flex-col outline-none"
          style={{ background: pocketBackground }}
        >
          <DialogPrimitive.Title className="sr-only">{binder.name} — fullscreen preview</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Flip through the binder page by page. Use the arrow keys, swipe, or tap the edges to navigate.
          </DialogPrimitive.Description>

          <DialogPrimitive.Close asChild>
            <button
              type="button"
              aria-label="Close preview"
              className="absolute top-3 right-3 z-30 flex size-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
            >
              <X className="size-5" />
            </button>
          </DialogPrimitive.Close>

          {pageCount === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-white/70">This binder has no pages yet.</div>
          ) : isLandscape ? (
            <div
              className="relative flex flex-1 items-center justify-center overflow-hidden p-4"
              style={containerStyle()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <EdgeButton side="left" onClick={goPrev} disabled={index === 0} />
              <div key={index} className={cn("flex items-stretch justify-center", transitionClass)}>
                <div
                  className="relative flex items-stretch rounded-2xl p-2 shadow-2xl sm:p-3"
                  style={{
                    background: `linear-gradient(180deg, ${coverColor}, color-mix(in oklab, ${coverColor}, black 35%))`,
                    ...containedBoxStyle(pageAspectRatio),
                  }}
                >
                  {spreads[index]?.map((page, i) =>
                    page ? (
                      <BinderPageView
                        key={page.id}
                        page={page}
                        pageNumber={binder.pages.findIndex((p) => p.id === page.id) + 1}
                        rows={layout.rows}
                        cols={layout.cols}
                        side={i === 0 ? "left" : "right"}
                        {...readOnlyProps}
                      />
                    ) : (
                      // The inside-front-cover: a blank left panel, same color as the binder, no pockets.
                      <div key="blank-cover" className="min-w-0 flex-1 rounded-l-xl" aria-hidden />
                    )
                  )}
                </div>
              </div>
              <EdgeButton side="right" onClick={goNext} disabled={index === maxIndex} />
            </div>
          ) : (
            <div
              className="relative mx-auto flex w-full max-w-md flex-1 items-center justify-center overflow-hidden p-4"
              style={containerStyle()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <EdgeButton side="left" onClick={goPrev} disabled={index === 0} />
              <div key={index} className={cn("flex items-stretch justify-center", transitionClass)}>
                <div
                  className="relative flex items-stretch rounded-2xl p-2 shadow-2xl sm:p-3"
                  style={{
                    background: `linear-gradient(180deg, ${coverColor}, color-mix(in oklab, ${coverColor}, black 35%))`,
                    ...containedBoxStyle(pageAspectRatio),
                  }}
                >
                  <BinderPageView
                    page={binder.pages[index]}
                    pageNumber={index + 1}
                    rows={layout.rows}
                    cols={layout.cols}
                    side="single"
                    {...readOnlyProps}
                  />
                </div>
              </div>
              <EdgeButton side="right" onClick={goNext} disabled={index === maxIndex} />
            </div>
          )}

          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/60">
            {isLandscape
              ? (() => {
                  const spreadPageNumbers = spreads[index]
                    .filter((page): page is BinderPage => page !== null)
                    .map((page) => binder.pages.indexOf(page) + 1);
                  return spreadPageNumbers.length === 1
                    ? `Page ${spreadPageNumbers[0]} of ${pageCount}`
                    : `Pages ${spreadPageNumbers[0]}–${spreadPageNumbers[spreadPageNumbers.length - 1]} of ${pageCount}`;
                })()
              : `Page ${index + 1} of ${pageCount}`}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function EdgeButton({ side, onClick, disabled }: { side: "left" | "right"; onClick: () => void; disabled: boolean }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous page" : "Next page"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "absolute top-0 bottom-0 z-20 flex w-1/5 items-center text-white/0 transition-colors hover:text-white/70 disabled:pointer-events-none disabled:text-white/0",
        side === "left" ? "left-0 justify-start pl-1" : "right-0 justify-end pr-1"
      )}
    >
      <Icon className="size-8 drop-shadow" />
    </button>
  );
}
