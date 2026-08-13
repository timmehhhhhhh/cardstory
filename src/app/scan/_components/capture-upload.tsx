"use client";

import * as React from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.85;

function resizeAndEncode(file: File): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
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
        resolve({ base64, mimeType: "image/jpeg", previewUrl: dataUrl });
      };
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function CaptureUpload({
  onCapture,
}: {
  onCapture: (result: { base64: string; mimeType: string; previewUrl: string }) => void;
}) {
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  async function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const result = await resizeAndEncode(file);
    onCapture(result);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className={
        "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 text-center transition-colors " +
        (dragOver ? "border-primary bg-primary/5" : "border-border bg-surface")
      }
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Camera className="size-6" />
      </div>
      <div>
        <p className="font-medium">Scan a card</p>
        <p className="text-sm text-muted-foreground">
          Take a photo or upload an image — we&apos;ll try to identify it automatically.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => cameraInputRef.current?.click()}>
          <Camera className="size-4" /> Take photo
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="size-4" /> Upload image
        </Button>
      </div>
      <p className="max-w-xs text-xs text-muted-foreground">
        Photos are sent to Google Gemini to identify the card. Nothing is stored beyond this request.
      </p>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
