"use client";

import * as React from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resizeImageToDataUrl } from "@/lib/utils/image";

/**
 * Inline "paste a URL or upload a photo" field, shared by the two Add
 * dialogs (a TCG holding's personal photo, a sports card's catalog image,
 * a sports holding's personal photo). Controlled — the caller owns the
 * string state, so it composes with each dialog's own resetForm().
 */
export function CardPhotoField({
  id,
  label,
  helperText,
  value,
  onChange,
}: {
  id: string;
  label: string;
  helperText?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      onChange(await resizeImageToDataUrl(file));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        {value && (
          <div className="relative h-11 w-8 flex-none overflow-hidden rounded bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary hosts + data URLs, not worth next/image's loader config */}
            <img src={value} alt="" className="h-full w-full object-contain" />
          </div>
        )}
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or upload a photo"
          className="bg-background"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Upload a photo"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onChange("")}
            aria-label="Remove photo"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
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
