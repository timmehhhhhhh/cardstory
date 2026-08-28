"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/cards/card-image";
import { CONFIDENCE_LABELS } from "@/lib/scan-cards/confidence-labels";
import type { PagePlacement } from "@/lib/binder-import/types";
import type { DetectedCard } from "@/lib/scanning";

/**
 * The per-pocket review dialog — src/lib/binder-import spec's "tap a pocket
 * and change the identified card" / "mark empty / unidentified / skip".
 * "Change card" delegates to src/app/scan/_components/change-card-dialog.tsx
 * (opened by the caller, not this component, so only one ChangeCardDialog
 * instance exists per page — see import-client.tsx).
 */
export function PocketReviewControl({
  open,
  onOpenChange,
  placement,
  onChangeCard,
  onMarkEmpty,
  onMarkSkip,
  onMarkUnidentified,
  onResolveAmbiguity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placement: PagePlacement | null;
  onChangeCard: () => void;
  onMarkEmpty: () => void;
  onMarkSkip: () => void;
  onMarkUnidentified: () => void;
  onResolveAmbiguity: (card: DetectedCard) => void;
}) {
  if (!placement) return null;
  const pocketLabel = `Pocket ${placement.pocketIndex + 1}`;
  const selected = placement.card?.candidates.find((c) => c.catalogItemId === placement.card?.selectedCandidateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{pocketLabel}</DialogTitle>
          <DialogDescription>
            {placement.status === "conflict" && placement.ambiguousCards
              ? "Two detected cards landed in this pocket — pick which one belongs here."
              : "Review or correct what CardStory detected in this pocket."}
          </DialogDescription>
        </DialogHeader>

        {placement.status === "conflict" && placement.ambiguousCards && (
          <div className="flex flex-col gap-2">
            {placement.ambiguousCards.map((card) => {
              const candidate = card.candidates[0];
              return (
                <button
                  key={card.cardId}
                  type="button"
                  onClick={() => onResolveAmbiguity(card)}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:border-primary/40"
                >
                  <div className="relative h-14 w-10 flex-none overflow-hidden rounded bg-muted">
                    <CardImage src={candidate?.imageSmallUrl} alt="" className="object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{candidate?.name ?? "Unidentified"}</p>
                    <p className="truncate text-xs text-muted-foreground">{candidate?.setName}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {placement.card && placement.status !== "conflict" && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
            <div className="relative h-16 w-11 flex-none overflow-hidden rounded bg-muted">
              <CardImage src={selected?.imageSmallUrl} alt="" className="object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{selected?.name ?? "Not identified"}</p>
              <p className="truncate text-xs text-muted-foreground">{selected?.setName}</p>
              <p className="text-xs text-muted-foreground">{CONFIDENCE_LABELS[placement.card.confidenceLevel]}</p>
            </div>
          </div>
        )}

        {placement.status === "identified" && (
          <p className="text-xs text-muted-foreground">
            Matched by name, number, and set only — holo/reverse-holo, 1st Edition vs. Unlimited, language, and
            promo variants aren&apos;t verified. Check the physical card matches before confirming.
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {placement.card && (
            <Button variant="outline" size="sm" onClick={onChangeCard}>
              Change card
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onMarkEmpty}>
            Mark empty
          </Button>
          {placement.card && placement.status !== "unidentified" && (
            <Button variant="outline" size="sm" onClick={onMarkUnidentified}>
              Mark not identified
            </Button>
          )}
          {placement.card && placement.status !== "skip" && (
            <Button variant="outline" size="sm" onClick={onMarkSkip}>
              Skip pocket
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
