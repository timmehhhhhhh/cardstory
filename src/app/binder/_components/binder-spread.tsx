"use client";

import * as React from "react";
import { containedBoxStyle, containerStyle } from "@/lib/binder/fit-style";
import { BinderPageView } from "@/app/binder/_components/binder-page-view";
import type { BinderPage, PocketRef } from "@/lib/binder/types";
import type { EnrichedHolding } from "@/lib/pc/selectors";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";

export interface VisiblePage {
  page: BinderPage;
  pageNumber: number;
  side: "left" | "right" | "single";
}

export function BinderSpread({
  visiblePages,
  coverColor,
  pocketBackground,
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
  /** Resolved CSS color behind every pocket (see resolvedPocketBackgroundColor) — independent of the outer cover gradient. */
  pocketBackground: string;
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
  const aspectRatio = isSpread ? (cols * 2) / rows : cols / rows;

  return (
    <div className="flex min-h-[240px] min-w-0 flex-1 items-center justify-center overflow-hidden" style={containerStyle()}>
      <div
        className="relative flex items-stretch rounded-2xl p-2 shadow-2xl sm:p-3"
        style={{
          background: `linear-gradient(180deg, ${coverColor}, color-mix(in oklab, ${coverColor}, black 35%))`,
          ...containedBoxStyle(aspectRatio),
        }}
      >
        {visiblePages.map(({ page, pageNumber, side }, i) => (
          <React.Fragment key={page.id}>
            {isSpread && i === 1 && (
              <div
                aria-hidden
                className="pointer-events-none relative z-20 w-3 shrink-0 shadow-[inset_4px_0_8px_-4px_rgba(0,0,0,0.6),inset_-4px_0_8px_-4px_rgba(0,0,0,0.6)]"
                style={{ background: `color-mix(in oklab, ${coverColor}, black 45%)` }}
              />
            )}
            <BinderPageView
              page={page}
              pageNumber={pageNumber}
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
              background={pocketBackground}
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
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
