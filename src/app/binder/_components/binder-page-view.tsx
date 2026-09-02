"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BinderPocket, type PocketCard } from "@/app/binder/_components/binder-pocket";
import type { BinderPage, PocketRef } from "@/lib/binder/types";
import type { EnrichedHolding } from "@/lib/pc/selectors";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";

/** Resolves a pocket's stored reference into display data, whichever kind it is — the one place holding/catalog/custom is branched on for rendering. Returns undefined for an empty slot AND for a "custom-covered" slot (rendered as a spacer, never a pocket of its own — see the render loop below). */
function resolvePocketCard(
  ref: BinderPage["pockets"][number],
  cardsById: Map<string, EnrichedHolding>,
  catalogItemsById: Map<string, CatalogItemDetail>
): PocketCard | undefined {
  if (!ref || ref.kind === "custom-covered") return undefined;
  if (ref.kind === "holding") {
    const holding = cardsById.get(ref.holdingId);
    if (!holding) return undefined;
    return {
      name: holding.display.name,
      nameEn: holding.display.nameEn,
      number: holding.display.number,
      imageUrl: holding.display.imageUrl,
      notOwned: false,
      isCustom: false,
    };
  }
  if (ref.kind === "custom") {
    return {
      name: "Custom image",
      nameEn: null,
      number: null,
      imageUrl: ref.dataUrl,
      notOwned: false,
      isCustom: true,
    };
  }
  const item = catalogItemsById.get(ref.catalogItemId);
  if (!item) return undefined;
  return {
    name: item.name,
    nameEn: item.nameEn,
    number: item.number,
    imageUrl: item.imageSmallUrl,
    notOwned: true,
    isCustom: false,
  };
}

/** `edge` is the page edge the holes sit against (the spine side). */
function PunchHoles({ edge }: { edge: "left" | "right" }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 z-10 flex w-3 flex-col items-center justify-evenly py-8",
        edge === "left" ? "left-0.5" : "right-0.5"
      )}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 rounded-full bg-black/30 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] dark:bg-black/50"
        />
      ))}
    </div>
  );
}

export function BinderPageView({
  page,
  pageNumber,
  rows,
  cols,
  side,
  cardsById,
  catalogItemsById,
  selectedPocket,
  dragSourcePageId,
  dragOverSlot,
  showNumberTags,
  showNotOwnedTags,
  pageBackground,
  interactive = true,
  onSelectPocket,
  onClearPocket,
  onResizeCustomImage,
  onDragStartSlot,
  onDragOverSlot,
  onDragLeaveSlot,
  onDropSlot,
  onDragEndSlot,
  onRemovePage,
}: {
  page: BinderPage;
  pageNumber: number;
  rows: number;
  cols: number;
  side: "left" | "right" | "single";
  cardsById: Map<string, EnrichedHolding>;
  catalogItemsById: Map<string, CatalogItemDetail>;
  selectedPocket: PocketRef | null;
  dragSourcePageId: string | null;
  dragOverSlot: number | null;
  showNumberTags: boolean;
  showNotOwnedTags: boolean;
  /** Resolved CSS color behind/around the pockets on this page (see resolvedPageBackgroundColor). */
  pageBackground: string;
  /** False in the fullscreen preview — hides editing chrome (remove-page, add/remove pocket controls, drag) entirely. */
  interactive?: boolean;
  onSelectPocket?: (slotIndex: number) => void;
  onClearPocket?: (slotIndex: number) => void;
  /** Opens the resize dialog for a custom-image anchor at this slot. */
  onResizeCustomImage?: (slotIndex: number) => void;
  onDragStartSlot?: (slotIndex: number) => void;
  onDragOverSlot?: (slotIndex: number) => void;
  onDragLeaveSlot?: () => void;
  onDropSlot?: (slotIndex: number) => void;
  onDragEndSlot?: () => void;
  onRemovePage?: () => void;
}) {
  // Pages are punched on the spine-side edge: left pages hinge on their
  // right, right/single pages hinge on their left.
  const holeEdge = side === "left" ? "right" : "left";

  return (
    <div
      style={{ background: pageBackground }}
      className={cn(
        "relative flex min-w-0 flex-1 flex-col p-3 shadow-lg ring-1 ring-black/10 sm:p-4",
        side === "left" && "rounded-l-xl pr-4",
        side === "right" && "rounded-r-xl pl-4",
        side === "single" && "rounded-xl pl-4"
      )}
    >
      <PunchHoles edge={holeEdge} />

      <div
        className="grid flex-1 gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {page.pockets.map((ref, slotIndex) => {
          // A slot covered by another anchor's span isn't its own pocket —
          // nothing renders here at all. The anchor below gets an explicit
          // colSpan/rowSpan > 1 (via gridPlacement) that already reserves
          // this cell, so no placeholder is needed. (An earlier version
          // rendered an unstyled spacer div here to "reserve" the cell for
          // the browser's auto-placement — that's exactly what corrupted
          // every later pocket's position whenever a span existed, since
          // auto-flow's next-free-cell cursor has no idea a styled sibling
          // already claimed this cell. Every pocket now gets an explicit
          // position below instead of relying on auto-flow at all.)
          if (ref?.kind === "custom-covered") return null;

          const isAnchor = ref?.kind === "custom";
          const gridPlacement = {
            colStart: (slotIndex % cols) + 1,
            rowStart: Math.floor(slotIndex / cols) + 1,
            colSpan: isAnchor && ref.kind === "custom" ? ref.spanCols : 1,
            rowSpan: isAnchor && ref.kind === "custom" ? ref.spanRows : 1,
          };
          return (
            <BinderPocket
              key={slotIndex}
              card={resolvePocketCard(ref, cardsById, catalogItemsById)}
              selected={selectedPocket?.pageId === page.id && selectedPocket.slotIndex === slotIndex}
              draggedOver={dragSourcePageId != null && dragOverSlot === slotIndex}
              showNumberTag={showNumberTags}
              showNotOwnedTag={showNotOwnedTags}
              gridPlacement={gridPlacement}
              interactive={interactive}
              // A custom-image anchor's click opens the resize dialog instead
              // of the normal card picker — mirrors a plain card's click =
              // swap / drag = move by making a custom image's click = resize
              // / drag = reposition (see BinderClient's handleDrop).
              onSelect={() => (isAnchor ? onResizeCustomImage?.(slotIndex) : onSelectPocket?.(slotIndex))}
              onClear={() => onClearPocket?.(slotIndex)}
              onResize={() => onResizeCustomImage?.(slotIndex)}
              onDragStart={() => onDragStartSlot?.(slotIndex)}
              onDragOver={(e) => {
                e.preventDefault();
                onDragOverSlot?.(slotIndex);
              }}
              onDragLeave={onDragLeaveSlot}
              onDrop={(e) => {
                e.preventDefault();
                onDropSlot?.(slotIndex);
              }}
              onDragEnd={onDragEndSlot}
            />
          );
        })}
      </div>

      {interactive && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <p className="text-[11px] text-muted-foreground/70">Page {pageNumber}</p>
          <button
            type="button"
            onClick={onRemovePage}
            aria-label={`Remove page ${pageNumber}`}
            className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:bg-black/10 hover:text-negative dark:hover:bg-white/10"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}
