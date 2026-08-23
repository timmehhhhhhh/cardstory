"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CardImage } from "@/components/cards/card-image";
import { CardNumberBadge } from "@/components/cards/card-number-badge";
import { cn } from "@/lib/utils";
import type { CardStoryFace } from "@/lib/collections/stacks";

/**
 * "How did this copy end up in your collection?" — the detail view for one
 * face of a card stack (see card-stack.tsx). Distinct from the aggregate
 * catalog page at /card/[game]/[cardId]: that page is about the *card*
 * (price history, comps); this dialog is about *this specific physical
 * copy* — when it was acquired, what it cost, any notes the owner left.
 *
 * When the stack has more than one copy, the same next/prev affordance
 * reappears here, but the transition between faces is a card-flip
 * (rotateY) rather than the stack tile's lateral slide — a deliberately
 * different gesture-to-motion pairing so "flipping through each copy's
 * story" reads as its own action, distinct from "swiping the stack".
 */
export function CardStoryDialog({
  faces,
  initialIndex,
  open,
  onOpenChange,
}: {
  faces: CardStoryFace[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const total = faces.length;
  const [index, setIndex] = React.useState(initialIndex);
  const [flipDirection, setFlipDirection] = React.useState<1 | -1>(1);
  // Re-sync when a different face is opened while the dialog was already
  // mounted (e.g. reopened from a different stack) — adjusted during render
  // per https://react.dev/learn/you-might-not-need-an-effect.
  const [prevInitialIndex, setPrevInitialIndex] = React.useState(initialIndex);
  if (open && initialIndex !== prevInitialIndex) {
    setPrevInitialIndex(initialIndex);
    setIndex(initialIndex);
  }

  const wrap = React.useCallback((n: number) => ((n % total) + total) % total, [total]);
  const goTo = React.useCallback(
    (n: number, direction: 1 | -1) => {
      setFlipDirection(direction);
      setIndex(wrap(n));
    },
    [wrap]
  );

  React.useEffect(() => {
    if (!open || total <= 1) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goTo(index + 1, 1);
      else if (e.key === "ArrowLeft") goTo(index - 1, -1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, total, index, goTo]);

  const face = faces[index];
  if (!face) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{face.name}</DialogTitle>
          <DialogDescription>
            {face.nameEn ? `${face.nameEn} · ` : ""}
            {face.subtitle}
            {total > 1 ? ` · Story ${index + 1} of ${total}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4" style={{ perspective: 1200 }}>
          <div className="relative">
            <div
              key={face.key}
              className={cn(
                "motion-reduce:animate-none",
                flipDirection === 1 ? "animate-card-flip-in" : "animate-card-flip-in-reverse"
              )}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="relative mx-auto aspect-[5/7] w-40 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60">
                <CardImage src={face.imageUrl} alt={face.name} className="object-contain p-2" fallbackVariant="icon-label" />
                <CardNumberBadge number={face.number} variant="overlay" />
              </div>
            </div>

            {total > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous copy's story"
                  onClick={() => goTo(index - 1, -1)}
                  className="absolute top-1/2 left-0 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur hover:bg-background"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Next copy's story"
                  onClick={() => goTo(index + 1, 1)}
                  className="absolute top-1/2 right-0 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur hover:bg-background"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </>
            )}
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            {face.fields.map((f) => (
              <React.Fragment key={f.label}>
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="min-w-0 font-medium break-words">{f.value}</dd>
              </React.Fragment>
            ))}
          </dl>

          {total > 1 && (
            <div role="tablist" aria-label="Copy" className="flex items-center justify-center gap-1.5">
              {faces.map((f, i) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Copy ${i + 1} of ${total}`}
                  onClick={() => goTo(i, i > index ? 1 : -1)}
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    i === index ? "bg-primary" : "bg-foreground/30 hover:bg-foreground/50"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
