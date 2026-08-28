"use client";

import * as React from "react";
import { Camera, RotateCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 0.85;

export interface CapturedPage {
  base64: string;
  mimeType: string;
  previewUrl: string;
  pixelWidth: number;
  pixelHeight: number;
}

/**
 * Resizes + re-encodes a File to a canvas the same way
 * src/app/scan/_components/mass-scan-capture.tsx does (maxDim 1400px, JPEG
 * 0.85), then draws it again at `rotationDeg` (0/90/180/270) so a photo
 * taken sideways can be straightened before it's sent anywhere — there is
 * no EXIF-orientation handling anywhere else in this codebase, and grid
 * mapping (src/lib/scanning/geometry.ts's mapCardsToGrid) needs the image's
 * "up" to actually match the physical page's "up".
 */
function resizeRotateAndEncode(file: File, rotationDeg: 0 | 90 | 180 | 270): Promise<CapturedPage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const baseWidth = Math.round(img.width * scale);
        const baseHeight = Math.round(img.height * scale);
        const swapped = rotationDeg === 90 || rotationDeg === 270;
        const width = swapped ? baseHeight : baseWidth;
        const height = swapped ? baseWidth : baseHeight;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));

        ctx.translate(width / 2, height / 2);
        ctx.rotate((rotationDeg * Math.PI) / 180);
        ctx.drawImage(img, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);

        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: "image/jpeg", previewUrl: dataUrl, pixelWidth: width, pixelHeight: height });
      };
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Physical Binder Import's capture step: one photo per physical page (not
 * Mass Scanner's multi-photo batch), an explicit, always-editable physical
 * page number (never inferred from card content — see AGENTS.md), and a
 * manual rotate stepper.
 */
export function PageCapture({
  nextPageNumber,
  onSubmit,
  disabled,
}: {
  /** Suggested next physical page number ("last confirmed + 1") — always user-editable/confirmable, never assumed. */
  nextPageNumber: number;
  onSubmit: (page: CapturedPage, physicalPageNumber: number) => void;
  disabled?: boolean;
}) {
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [rotation, setRotation] = React.useState<0 | 90 | 180 | 270>(0);
  const [captured, setCaptured] = React.useState<CapturedPage | null>(null);
  const [pageNumber, setPageNumber] = React.useState(nextPageNumber);
  const [error, setError] = React.useState<string | null>(null);

  const [prevSuggested, setPrevSuggested] = React.useState(nextPageNumber);
  if (nextPageNumber !== prevSuggested) {
    setPrevSuggested(nextPageNumber);
    setPageNumber(nextPageNumber);
  }

  // Clears the stale encoded preview synchronously as soon as `file`
  // changes (during render, not in an effect — see
  // src/app/binder/_components/binder-client.tsx for the same pattern),
  // then the effect below only ever does the actual async encode work.
  const [prevFile, setPrevFile] = React.useState<File | null>(null);
  if (file !== prevFile) {
    setPrevFile(file);
    setCaptured(null);
  }

  React.useEffect(() => {
    if (!file) return;
    let cancelled = false;
    resizeRotateAndEncode(file, rotation)
      .then((result) => {
        if (!cancelled) setCaptured(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't read that image. Please try a different file.");
      });
    return () => {
      cancelled = true;
    };
  }, [file, rotation]);

  function handleFiles(fileList: FileList | null) {
    const picked = fileList?.[0];
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setError("That doesn't look like an image — try a photo of the binder page.");
      return;
    }
    setError(null);
    setRotation(0);
    setFile(picked);
  }

  return (
    <div className="flex flex-col gap-4">
      {!captured ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border bg-surface p-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Camera className="size-6" />
          </div>
          <div>
            <p className="font-medium">Photograph page {nextPageNumber}</p>
            <p className="text-sm text-muted-foreground">
              Fill the frame with the binder page — pockets edge to edge works best.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => cameraInputRef.current?.click()}>
              <Camera className="size-4" /> Take photo
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" /> Upload photo
            </Button>
          </div>
          {error && <p className="text-xs text-negative">{error}</p>}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={captured.previewUrl} alt="Captured binder page" className="block w-full" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="absolute right-2 top-2 bg-background/90"
              onClick={() => setRotation((r) => (((r + 90) % 360) as 0 | 90 | 180 | 270))}
            >
              <RotateCw className="size-3.5" /> Rotate
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="physical-page-number">Physical page number</Label>
              <Input
                id="physical-page-number"
                type="number"
                min={1}
                value={pageNumber}
                onChange={(e) => setPageNumber(Math.max(1, Number(e.target.value) || 1))}
                className={cn("w-28 bg-background")}
              />
            </div>
            <Button
              size="lg"
              disabled={disabled}
              onClick={() => onSubmit(captured, pageNumber)}
            >
              Scan page {pageNumber}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFile(null);
                setRotation(0);
              }}
            >
              Retake
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
