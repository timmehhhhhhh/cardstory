"use client";

import * as React from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 0.85;

export interface CapturedPhoto {
  id: string;
  base64: string;
  mimeType: string;
  previewUrl: string;
  pixelWidth: number;
  pixelHeight: number;
}

function resizeAndEncode(file: File): Promise<Omit<CapturedPhoto, "id">> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, width, height);

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

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * The Mass Card Scanner's entry step: collect one or more photos (camera or
 * upload, multiple at once) before a single "Scan N photos" kicks off
 * processing. Adapts the old single-card capture-upload.tsx's
 * resize-before-send convention (still needed: no image-upload/CDN
 * infrastructure exists to hand the API a URL instead — see
 * src/lib/scanning/types.ts's ImageRef comment) for a `multiple` file input
 * and a removable thumbnail strip.
 */
export function MassScanCapture({
  photos,
  onAddPhotos,
  onRemovePhoto,
  onSubmit,
  disabled,
}: {
  photos: CapturedPhoto[];
  onAddPhotos: (photos: CapturedPhoto[]) => void;
  onRemovePhoto: (id: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFiles(fileList: FileList | File[] | null | undefined) {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      setError("That doesn't look like an image — try a photo or screenshot of your cards.");
      return;
    }
    setError(null);
    try {
      const encoded = await Promise.all(files.map(resizeAndEncode));
      onAddPhotos(encoded.map((e) => ({ ...e, id: makeId() })));
    } catch {
      setError("Couldn't read that image. Please try a different file.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border bg-surface"
        )}
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Camera className="size-6" />
        </div>
        <div>
          <p className="font-medium">Scan Cards</p>
          <p className="text-sm text-muted-foreground">
            Scan multiple cards at once and add them to your collection.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => cameraInputRef.current?.click()}>
            <Camera className="size-4" /> Take photo
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" /> Upload images
          </Button>
        </div>
        <p className="max-w-xs text-xs text-muted-foreground">
          Photograph a spread of cards or upload several at once — we&apos;ll try to identify every
          card in each photo. Photos are sent to Google Gemini to identify cards; nothing is stored
          beyond this request.
        </p>
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
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {photos.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            {photos.map((photo, i) => (
              <div
                key={photo.id}
                className="group relative aspect-[3/4] w-20 flex-none overflow-hidden rounded-lg border border-border bg-surface"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.previewUrl} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemovePhoto(photo.id)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <Button size="lg" className="w-full sm:w-auto" onClick={onSubmit} disabled={disabled}>
            Scan {photos.length} photo{photos.length === 1 ? "" : "s"}
          </Button>
        </div>
      )}
    </div>
  );
}
