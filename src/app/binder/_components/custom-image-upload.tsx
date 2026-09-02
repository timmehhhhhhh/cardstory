"use client";

import * as React from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resizeImageToDataUrl } from "@/lib/utils/image";
import { customSpanCells, type BinderPage } from "@/lib/binder/types";
import type { PlaceCustomImageResult } from "@/lib/binder/store";
import { SpanStepper } from "@/app/binder/_components/span-stepper";
import { SpanPreviewGrid } from "@/app/binder/_components/span-preview-grid";

/**
 * "Michi Method" custom-image placement: upload a photo, then size the
 * pocket span it should fill via steppers (not drag-select — see the plan).
 * The span is clamped live to what fits the page from the anchor pocket, and
 * any cell that's already occupied is flagged before the user can submit, so
 * the authoritative `placeCustomImage` store call (re-validated there too)
 * should only ever fail on a genuine race, not a UI-visible mistake.
 */
export function CustomImageTab({
  page,
  cols,
  rows,
  anchorSlotIndex,
  onPlace,
}: {
  page: BinderPage;
  cols: number;
  rows: number;
  anchorSlotIndex: number;
  onPlace: (dataUrl: string, spanCols: number, spanRows: number) => PlaceCustomImageResult;
}) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [spanCols, setSpanCols] = React.useState(1);
  const [spanRows, setSpanRows] = React.useState(1);
  const [placeError, setPlaceError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const maxCols = cols - (anchorSlotIndex % cols);
  const maxRows = rows - Math.floor(anchorSlotIndex / cols);
  const clampedCols = Math.min(spanCols, maxCols);
  const clampedRows = Math.min(spanRows, maxRows);

  const spanCells = React.useMemo(
    () => new Set(customSpanCells(anchorSlotIndex, clampedCols, clampedRows, cols)),
    [anchorSlotIndex, clampedCols, clampedRows, cols]
  );
  const overlapsExisting = [...spanCells].some((cell) => page.pockets[cell] != null && cell !== anchorSlotIndex);

  async function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    setPlaceError(null);
    try {
      setDataUrl(await resizeImageToDataUrl(file));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handlePlace() {
    if (!dataUrl) return;
    const result = onPlace(dataUrl, clampedCols, clampedRows);
    if (!result.ok) {
      setPlaceError(
        result.reason === "out-of-bounds"
          ? "That span doesn't fit on this page from here."
          : "That span overlaps a card or image already in this binder."
      );
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
      <div className="grid gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">Image</p>
        <div className="flex items-center gap-2">
          {dataUrl && (
            <div className="relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL, not a remote/optimizable src */}
              <img src={dataUrl} alt="" className="h-full w-full object-contain" />
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {dataUrl ? "Replace photo" : "Upload photo"}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SpanStepper
          label="Pockets wide"
          value={clampedCols}
          max={maxCols}
          onChange={(v) => {
            setSpanCols(v);
            setPlaceError(null);
          }}
        />
        <SpanStepper
          label="Pockets tall"
          value={clampedRows}
          max={maxRows}
          onChange={(v) => {
            setSpanRows(v);
            setPlaceError(null);
          }}
        />
      </div>

      <div className="grid gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">Preview</p>
        <SpanPreviewGrid
          cols={cols}
          rows={rows}
          spanCells={spanCells}
          isCellBlocked={(i) => page.pockets[i] != null && i !== anchorSlotIndex}
        />
        {overlapsExisting && (
          <p className="text-center text-xs text-destructive">This span overlaps a card or image already placed.</p>
        )}
      </div>

      {placeError && <p className="text-center text-xs text-destructive">{placeError}</p>}

      <Button type="button" onClick={handlePlace} disabled={!dataUrl || overlapsExisting}>
        Place image
      </Button>
    </div>
  );
}
