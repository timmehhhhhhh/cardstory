"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { customSpanCells, type BinderPage } from "@/lib/binder/types";
import type { ResizeCustomImageResult } from "@/lib/binder/store";
import { SpanStepper } from "@/app/binder/_components/span-stepper";
import { SpanPreviewGrid } from "@/app/binder/_components/span-preview-grid";

/**
 * Lets the user grow/shrink an already-placed custom image's span in place —
 * the anchor slot stays fixed, only spanCols/spanRows change. Reuses the
 * same SpanStepper/SpanPreviewGrid the initial-placement flow
 * (custom-image-upload.tsx) uses, but — unlike that flow — must exclude the
 * group's OWN current cells from the "is this blocked" check, since the
 * group already occupies them.
 */
export function CustomImageResizeDialog({
  open,
  onOpenChange,
  page,
  cols,
  rows,
  anchorSlotIndex,
  currentSpanCols,
  currentSpanRows,
  onResize,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The page the image lives on, used only to read its other pockets' occupancy for the overlap preview. */
  page: BinderPage;
  cols: number;
  rows: number;
  anchorSlotIndex: number;
  currentSpanCols: number;
  currentSpanRows: number;
  onResize: (spanCols: number, spanRows: number) => ResizeCustomImageResult;
}) {
  const [spanCols, setSpanCols] = React.useState(currentSpanCols);
  const [spanRows, setSpanRows] = React.useState(currentSpanRows);
  const [resizeError, setResizeError] = React.useState<string | null>(null);

  // Reset the draft span back to the group's current size every time the
  // dialog is (re)opened — adjusted during render rather than in an effect,
  // same pattern as BinderPreview's `wasOpen` reset.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSpanCols(currentSpanCols);
      setSpanRows(currentSpanRows);
      setResizeError(null);
    }
  }

  const maxCols = cols - (anchorSlotIndex % cols);
  const maxRows = rows - Math.floor(anchorSlotIndex / cols);
  const clampedCols = Math.min(spanCols, maxCols);
  const clampedRows = Math.min(spanRows, maxRows);

  const ownCells = React.useMemo(
    () => new Set(customSpanCells(anchorSlotIndex, currentSpanCols, currentSpanRows, cols)),
    [anchorSlotIndex, currentSpanCols, currentSpanRows, cols]
  );
  const spanCells = React.useMemo(
    () => new Set(customSpanCells(anchorSlotIndex, clampedCols, clampedRows, cols)),
    [anchorSlotIndex, clampedCols, clampedRows, cols]
  );
  const overlapsExisting = [...spanCells].some((cell) => page.pockets[cell] != null && !ownCells.has(cell));
  const unchanged = clampedCols === currentSpanCols && clampedRows === currentSpanRows;

  function handleSave() {
    const result = onResize(clampedCols, clampedRows);
    if (!result.ok) {
      setResizeError(
        result.reason === "out-of-bounds"
          ? "That span doesn't fit on this page from here."
          : "That span overlaps a card or image already in this binder."
      );
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Resize custom image</DialogTitle>
          <DialogDescription>Change how many pockets this image fills, from its current spot.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <SpanStepper
            label="Pockets wide"
            value={clampedCols}
            max={maxCols}
            onChange={(v) => {
              setSpanCols(v);
              setResizeError(null);
            }}
          />
          <SpanStepper
            label="Pockets tall"
            value={clampedRows}
            max={maxRows}
            onChange={(v) => {
              setSpanRows(v);
              setResizeError(null);
            }}
          />
        </div>

        <div className="grid gap-1.5">
          <SpanPreviewGrid
            cols={cols}
            rows={rows}
            spanCells={spanCells}
            isCellBlocked={(i) => page.pockets[i] != null && !ownCells.has(i)}
          />
          {overlapsExisting && (
            <p className="text-center text-xs text-destructive">This span overlaps a card or image already placed.</p>
          )}
        </div>

        {resizeError && <p className="text-center text-xs text-destructive">{resizeError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={overlapsExisting || unchanged}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
