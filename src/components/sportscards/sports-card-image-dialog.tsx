"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resizeImageToDataUrl } from "@/lib/utils/image";

/** Small "+" affordance shown in place of a missing sports-card image; opens a dialog to attach one. */
export function SportsCardImageDialog({ sportsCardItemId }: { sportsCardItemId: string }) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  async function save(imageUrl: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/sportscards/${sportsCardItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["sportscards-by-ids"] });
        setOpen(false);
        setUrl("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setSaving(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await save(dataUrl);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Add image"
          className="flex h-full w-full items-center justify-center rounded bg-muted text-muted-foreground hover:text-primary"
        >
          <ImagePlus className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-surface border-border sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add an image</DialogTitle>
          <DialogDescription>Paste a link to an image, or upload a photo.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="sc-image-url">Image URL</Label>
            <div className="flex gap-2">
              <Input
                id="sc-image-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="bg-background"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!url.trim() || saving}
                onClick={() => save(url.trim())}
              >
                Use
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Upload a photo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
