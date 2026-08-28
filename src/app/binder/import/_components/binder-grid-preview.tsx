"use client";

import { AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardImage } from "@/components/cards/card-image";
import type { PagePlacement } from "@/lib/binder-import/types";

/**
 * Read-only visual grid preview of what a page will look like once
 * committed — deliberately a fresh, simple component rather than reusing
 * src/app/binder/_components/binder-pocket.tsx, which is drag/drop +
 * click-to-edit and owns live Binder Planner behavior; forcing a read-only
 * mode onto it risks touching that file's actual editing flows. This only
 * borrows its visual language (aspect-[5/7] tile, rounded corners, ring).
 */
export function BinderGridPreview({
  placements,
  rows,
  cols,
  onSelectPocket,
}: {
  placements: PagePlacement[];
  rows: number;
  cols: number;
  onSelectPocket: (pocketIndex: number) => void;
}) {
  return (
    <div
      className="grid gap-1.5 sm:gap-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {placements.map((placement) => (
        <button
          key={placement.pocketIndex}
          type="button"
          onClick={() => onSelectPocket(placement.pocketIndex)}
          aria-label={`Pocket ${placement.pocketIndex + 1} — ${placement.status}`}
          className={cn(
            "group relative aspect-[5/7] w-full overflow-hidden rounded-[3px] bg-black/15 ring-1 ring-inset ring-black/10 transition-shadow dark:bg-black/25",
            placement.status === "identified" && "ring-2 ring-positive/60",
            placement.status === "conflict" && "ring-2 ring-negative/70",
            placement.status === "unidentified" && "ring-2 ring-amber-500/70"
          )}
        >
          {placement.status === "identified" && placement.card && (
            <CardImage
              src={placement.card.candidates.find((c) => c.catalogItemId === placement.card!.selectedCandidateId)?.imageSmallUrl}
              alt=""
              className="object-contain p-0.5"
              fallback={
                <span className="flex size-full items-center justify-center px-1 text-center text-[9px] leading-tight text-muted-foreground">
                  {placement.card.candidates.find((c) => c.catalogItemId === placement.card!.selectedCandidateId)?.name ??
                    "Card"}
                </span>
              }
            />
          )}

          {placement.status === "empty" && (
            <span className="flex size-full items-center justify-center text-muted-foreground/40">·</span>
          )}

          {placement.status === "skip" && (
            <span className="flex size-full items-center justify-center text-[9px] text-muted-foreground/60">
              Skipped
            </span>
          )}

          {placement.status === "unidentified" && (
            <span className="flex size-full flex-col items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
              <HelpCircle className="size-4" />
              <span className="text-[9px]">Needs ID</span>
            </span>
          )}

          {placement.status === "conflict" && (
            <span className="flex size-full flex-col items-center justify-center gap-1 text-negative">
              <AlertTriangle className="size-4" />
              <span className="text-[9px]">Conflict</span>
            </span>
          )}

          <span className="pointer-events-none absolute left-0.5 top-0.5 rounded bg-background/80 px-1 text-[9px] font-bold text-muted-foreground backdrop-blur">
            {placement.pocketIndex + 1}
          </span>
        </button>
      ))}
    </div>
  );
}
