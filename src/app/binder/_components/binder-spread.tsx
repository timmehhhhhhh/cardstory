"use client";

import * as React from "react";
import { containedBoxStyle, containerStyle } from "@/lib/binder/fit-style";
import { BinderPageView } from "@/app/binder/_components/binder-page-view";
import { POCKET_ASPECT_RATIO } from "@/app/binder/_components/binder-pocket";
import type { BinderPage, PocketRef } from "@/lib/binder/types";
import type { EnrichedHolding } from "@/lib/pc/selectors";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";

export interface VisiblePage {
  /** null renders a blank inside-cover panel — the left half of page 1's spread, which has no partner page. */
  page: BinderPage | null;
  pageNumber: number | null;
  side: "left" | "right" | "single";
}

export function BinderSpread({
  visiblePages,
  coverColor,
  pageBackground,
  rows,
  cols,
  cardsById,
  catalogItemsById,
  selectedPocket,
  dragSourcePageId,
  dragOverPocket,
  showNumberTags,
  showNotOwnedTags,
  interactive = true,
  onSelectPocket,
  onClearPocket,
  onDragStartSlot,
  onDragOverSlot,
  onDragLeaveSlot,
  onDropSlot,
  onDragEndSlot,
  onRemovePage,
}: {
  visiblePages: VisiblePage[];
  coverColor: string;
  /** Resolved CSS color behind/around every pocket (see resolvedPageBackgroundColor) — independent of the outer cover gradient. */
  pageBackground: string;
  rows: number;
  cols: number;
  cardsById: Map<string, EnrichedHolding>;
  catalogItemsById: Map<string, CatalogItemDetail>;
  selectedPocket: PocketRef | null;
  dragSourcePageId: string | null;
  dragOverPocket: PocketRef | null;
  showNumberTags: boolean;
  showNotOwnedTags: boolean;
  /** False in the fullscreen preview — read-only rendering, no editing chrome. */
  interactive?: boolean;
  onSelectPocket?: (pageId: string, slotIndex: number) => void;
  onClearPocket?: (pageId: string, slotIndex: number) => void;
  onDragStartSlot?: (pageId: string, slotIndex: number) => void;
  onDragOverSlot?: (pageId: string, slotIndex: number) => void;
  onDragLeaveSlot?: () => void;
  onDropSlot?: (pageId: string, slotIndex: number) => void;
  onDragEndSlot?: () => void;
  onRemovePage?: (pageId: string) => void;
}) {
  const isSpread = visiblePages.length === 2;
  // Match the box's proportions to the actual card-shaped pockets it
  // contains (not a square cols/rows guess) so the container-query fit in
  // containedBoxStyle sizes to the grid's real aspect ratio instead of
  // leaving pockets stretched/squashed or a mismatched box that starves the
  // bottom rows. width:height = cols*5 : rows*7 per page (see
  // POCKET_ASPECT_RATIO), doubled for a two-page spread.
  const pageWidthUnits = cols * (isSpread ? 2 : 1);
  const aspectRatio = (pageWidthUnits * POCKET_ASPECT_RATIO) / rows;

  return (
    <div
      className="flex h-[min(72dvh,860px)] min-h-[320px] min-w-0 items-center justify-center overflow-hidden"
      style={containerStyle()}
    >
      <div
        className="relative flex items-stretch rounded-2xl p-2 shadow-2xl sm:p-3"
        style={{
          background: `linear-gradient(180deg, ${coverColor}, color-mix(in oklab, ${coverColor}, black 35%))`,
          ...containedBoxStyle(aspectRatio),
        }}
      >
        {visiblePages.map(({ page, pageNumber, side }, i) => (
          <React.Fragment key={page?.id ?? "blank-cover"}>
            {isSpread && i === 1 && (
              <div
                aria-hidden
                className="pointer-events-none relative z-20 w-3 shrink-0 shadow-[inset_4px_0_8px_-4px_rgba(0,0,0,0.6),inset_-4px_0_8px_-4px_rgba(0,0,0,0.6)]"
                style={{ background: `color-mix(in oklab, ${coverColor}, black 45%)` }}
              />
            )}
            {page === null ? (
              // The inside-front-cover: a blank panel, same color as the binder, no pockets.
              <div className="min-w-0 flex-1 rounded-l-xl" aria-hidden />
            ) : (
              <BinderPageView
                page={page}
                pageNumber={pageNumber ?? 1}
                rows={rows}
                cols={cols}
                side={side}
                cardsById={cardsById}
                catalogItemsById={catalogItemsById}
                selectedPocket={selectedPocket}
                dragSourcePageId={dragSourcePageId}
                dragOverSlot={dragOverPocket?.pageId === page.id ? dragOverPocket.slotIndex : null}
                showNumberTags={showNumberTags}
                showNotOwnedTags={showNotOwnedTags}
                pageBackground={pageBackground}
                interactive={interactive}
                onSelectPocket={(slotIndex) => onSelectPocket?.(page.id, slotIndex)}
                onClearPocket={(slotIndex) => onClearPocket?.(page.id, slotIndex)}
                onDragStartSlot={(slotIndex) => onDragStartSlot?.(page.id, slotIndex)}
                onDragOverSlot={(slotIndex) => onDragOverSlot?.(page.id, slotIndex)}
                onDragLeaveSlot={onDragLeaveSlot}
                onDropSlot={(slotIndex) => onDropSlot?.(page.id, slotIndex)}
                onDragEndSlot={onDragEndSlot}
                onRemovePage={() => onRemovePage?.(page.id)}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
