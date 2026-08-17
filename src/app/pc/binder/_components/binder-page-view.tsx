"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BinderPocket } from "@/app/pc/binder/_components/binder-pocket";
import type { BinderPage, PocketRef } from "@/lib/binder/types";
import type { EnrichedHolding } from "@/lib/pc/selectors";

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
  selectedPocket,
  dragSourcePageId,
  dragOverSlot,
  onSelectPocket,
  onClearPocket,
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
  selectedPocket: PocketRef | null;
  dragSourcePageId: string | null;
  dragOverSlot: number | null;
  onSelectPocket: (slotIndex: number) => void;
  onClearPocket: (slotIndex: number) => void;
  onDragStartSlot: (slotIndex: number) => void;
  onDragOverSlot: (slotIndex: number) => void;
  onDragLeaveSlot: () => void;
  onDropSlot: (slotIndex: number) => void;
  onDragEndSlot: () => void;
  onRemovePage: () => void;
}) {
  // Pages are punched on the spine-side edge: left pages hinge on their
  // right, right/single pages hinge on their left.
  const holeEdge = side === "left" ? "right" : "left";

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-1 flex-col bg-surface-elevated p-3 shadow-lg ring-1 ring-black/10 sm:p-4",
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
        {page.pockets.map((holdingId, slotIndex) => (
          <BinderPocket
            key={slotIndex}
            card={holdingId ? cardsById.get(holdingId) : undefined}
            selected={selectedPocket?.pageId === page.id && selectedPocket.slotIndex === slotIndex}
            draggedOver={dragSourcePageId != null && dragOverSlot === slotIndex}
            onSelect={() => onSelectPocket(slotIndex)}
            onClear={() => onClearPocket(slotIndex)}
            onDragStart={() => onDragStartSlot(slotIndex)}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOverSlot(slotIndex);
            }}
            onDragLeave={onDragLeaveSlot}
            onDrop={(e) => {
              e.preventDefault();
              onDropSlot(slotIndex);
            }}
            onDragEnd={onDragEndSlot}
          />
        ))}
      </div>

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
    </div>
  );
}
