"use client";

import { cn } from "@/lib/utils";

/**
 * Mini read-only replica of a binder page's grid, highlighting which cells a
 * candidate custom-image span would cover and whether any of them are
 * blocked (via `isCellBlocked`, caller-defined — "occupied by something
 * else" means different things for a fresh placement vs. resizing/moving an
 * existing group, since the latter must exclude the group's own current
 * cells). Shared by custom-image-upload.tsx (initial placement) and
 * custom-image-resize-dialog.tsx / custom-image-move-dialog.tsx (editing an
 * already-placed group).
 */
export function SpanPreviewGrid({
  cols,
  rows,
  spanCells,
  isCellBlocked,
}: {
  cols: number;
  rows: number;
  spanCells: Set<number>;
  isCellBlocked: (index: number) => boolean;
}) {
  return (
    <div
      className="mx-auto grid w-full max-w-40 gap-0.5"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
    >
      {Array.from({ length: rows * cols }, (_, i) => {
        const inSpan = spanCells.has(i);
        const blocked = isCellBlocked(i);
        return (
          <div
            key={i}
            className={cn(
              "aspect-[5/7] rounded-[2px] ring-1 ring-inset ring-black/10",
              inSpan && blocked && "bg-destructive/60",
              inSpan && !blocked && "bg-primary/60",
              !inSpan && "bg-black/10"
            )}
          />
        );
      })}
    </div>
  );
}
