"use client";

import * as React from "react";
import { RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CardImage } from "@/components/cards/card-image";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { CONFIDENCE_LABELS } from "@/lib/scan-cards/confidence-labels";
import { cn } from "@/lib/utils";
import type { ReviewItem } from "@/lib/scan-cards/review-state";

function confidenceBadgeClass(level: ReviewItem["card"]["confidenceLevel"]): string {
  switch (level) {
    case "HIGH":
      return "bg-positive/10 text-positive border-positive/30";
    case "MEDIUM":
      return "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400";
    case "LOW":
      return "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400";
    case "UNIDENTIFIED":
      return "bg-negative/10 text-negative border-negative/30";
  }
}

/**
 * One tile in the Mass Card Scanner's review grid — one detected card. Shows
 * a crop of the source photo (CSS-positioned from boundingBox, since the
 * engine's ImageProcessor doesn't produce real per-card crops yet — see
 * src/lib/scanning/image-processing/server-image-processor.ts), the
 * identified card via the existing CardImage/CardNumberBadge components,
 * confidence, "already in collection", and every reviewer action.
 */
export function ScanResultCard({
  item,
  index,
  ownedQuantity,
  onToggleInclude,
  onSkip,
  onUnskip,
  onChangeCard,
  onRetry,
  retrying,
}: {
  item: ReviewItem;
  index: number;
  ownedQuantity: number;
  onToggleInclude: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onChangeCard: () => void;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const { card } = item;
  const selected = card.candidates.find((c) => c.catalogItemId === card.selectedCandidateId) ?? card.candidates[0];
  const box = card.boundingBox;
  const canRetry = card.identificationStatus === "error" || card.identificationStatus === "unidentified";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-surface p-3 transition-opacity",
        card.skipped ? "border-border/60 opacity-60" : "border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative aspect-[3/4] w-16 flex-none overflow-hidden rounded-md border border-border bg-muted">
          <div
            className="absolute h-full w-full bg-cover bg-no-repeat"
            style={{
              backgroundImage: `url(${item.sourcePreviewUrl})`,
              backgroundPosition: `${(box.centerX * 100).toFixed(2)}% ${(box.centerY * 100).toFixed(2)}%`,
              backgroundSize: `${(100 / Math.max(box.width, 0.01)).toFixed(0)}% ${(100 / Math.max(box.height, 0.01)).toFixed(0)}%`,
            }}
          />
          <span className="absolute left-1 top-1 flex size-4 items-center justify-center rounded-full bg-background/90 text-[10px] font-bold">
            {index + 1}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {selected ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 truncate text-sm font-medium">{selected.name}</p>
                    <CardNumberBadge number={selected.number} className="flex-none" />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{selected.setName}</p>
                </>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  {card.error ?? "No match found"}
                </p>
              )}
            </div>
            <Checkbox
              checked={item.includeInBatch}
              onCheckedChange={onToggleInclude}
              disabled={card.skipped || !card.selectedCandidateId}
              aria-label={`Include card ${index + 1} in batch`}
            />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
                confidenceBadgeClass(card.confidenceLevel)
              )}
            >
              {CONFIDENCE_LABELS[card.confidenceLevel]}
            </span>
            {ownedQuantity > 0 && (
              <span className="inline-flex items-center rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Already in collection: {ownedQuantity}
              </span>
            )}
            {card.skipped && (
              <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Skipped
              </span>
            )}
          </div>

          {selected?.imageSmallUrl && (
            <div className="relative mt-2 aspect-[5/7] w-10 overflow-hidden rounded bg-muted">
              <CardImage src={selected.imageSmallUrl} alt="" sizes="40px" className="object-contain" />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" onClick={onChangeCard}>
          Change card
        </Button>
        {canRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying}>
            <RotateCcw className="size-3.5" /> {retrying ? "Retrying…" : "Retry"}
          </Button>
        )}
        {card.skipped ? (
          <Button size="sm" variant="ghost" onClick={onUnskip}>
            <Undo2 className="size-3.5" /> Undo skip
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={onSkip}>
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}
