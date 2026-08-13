"use client";

import * as React from "react";
import { Check, Copy, Share2, Trash2 } from "lucide-react";
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
import {
  clearShowcaseEntry,
  getShowcaseEntry,
  setShowcaseEntry,
} from "@/lib/showcase/local-registry";
import type { ShowcasePayload } from "@/lib/showcase/types";

export function PublishShowcaseDialog({
  portfolioId,
  portfolioName,
  buildPayload,
}: {
  portfolioId: string;
  portfolioName: string;
  buildPayload: () => ShowcasePayload;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(portfolioName);
  const [shareId, setShareId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Re-sync from localStorage each time the dialog opens — adjusted during
  // render (not in an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const entry = getShowcaseEntry(portfolioId);
      setShareId(entry?.shareId ?? null);
      setTitle(portfolioName);
      setCopied(false);
    }
  }

  const shareUrl = shareId && typeof window !== "undefined" ? `${window.location.origin}/showcase/${shareId}` : "";

  async function handlePublish() {
    setBusy(true);
    try {
      const payload = buildPayload();
      const existing = getShowcaseEntry(portfolioId);

      if (existing) {
        const res = await fetch(`/api/showcase/${existing.shareId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerToken: existing.ownerToken, title, payload }),
        });
        if (res.ok) {
          setShareId(existing.shareId);
          setShowcaseEntry(portfolioId, { ...existing, publishedAt: new Date().toISOString() });
        }
      } else {
        const res = await fetch("/api/showcase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, payload }),
        });
        if (res.ok) {
          const data = await res.json();
          setShareId(data.shareId);
          setShowcaseEntry(portfolioId, {
            shareId: data.shareId,
            ownerToken: data.ownerToken,
            publishedAt: new Date().toISOString(),
          });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleUnpublish() {
    const entry = getShowcaseEntry(portfolioId);
    if (!entry) return;
    setBusy(true);
    try {
      await fetch(`/api/showcase/${entry.shareId}?ownerToken=${entry.ownerToken}`, { method: "DELETE" });
      clearShowcaseEntry(portfolioId);
      setShareId(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
        >
          <Share2 className="size-4" /> Showcase
        </button>
      </DialogTrigger>
      <DialogContent className="bg-surface border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Showcase this portfolio</DialogTitle>
          <DialogDescription>
            Publishes a point-in-time snapshot to a public link. No account needed — this browser is
            the only place that can update or remove it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label htmlFor="showcase-title">Title</Label>
          <Input
            id="showcase-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background"
          />
        </div>

        {shareUrl && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{shareUrl}</span>
            <button
              type="button"
              aria-label="Copy link"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="size-4 text-positive" /> : <Copy className="size-4" />}
            </button>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {shareId ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={handleUnpublish}
              className="border-negative/40 text-negative hover:bg-negative/10"
            >
              <Trash2 className="size-4" /> Unpublish
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handlePublish} disabled={busy}>
            {shareId ? "Republish" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
