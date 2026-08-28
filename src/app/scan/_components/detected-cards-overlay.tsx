"use client";

import { cn } from "@/lib/utils";
import type { DetectedCard } from "@/lib/scanning";

/**
 * Renders one source photo with every detected card's bounding box drawn
 * over it, numbered in reading order (1, 2, 3…) — lets a reviewer see at a
 * glance which crop in the grid below came from where in the original
 * photo. Pure CSS (percentage-positioned divs from BoundingBox, which is
 * already normalized to [0,1] — see src/lib/scanning/types.ts), no canvas.
 */
export function DetectedCardsOverlay({
  previewUrl,
  cards,
  className,
}: {
  previewUrl: string;
  cards: DetectedCard[];
  className?: string;
}) {
  return (
    <div className={cn("relative w-full overflow-hidden rounded-xl border border-border bg-surface", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={previewUrl} alt="Scanned photo" className="block w-full" />
      {cards.map((card, i) => {
        const box = card.boundingBox;
        return (
          <div
            key={card.cardId}
            className={cn(
              "absolute rounded-sm border-2",
              card.skipped
                ? "border-border/60"
                : card.confidenceLevel === "HIGH"
                  ? "border-positive/80"
                  : card.confidenceLevel === "UNIDENTIFIED"
                    ? "border-negative/70"
                    : "border-amber-500/80"
            )}
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`,
            }}
          >
            <span className="absolute -left-1 -top-1 flex size-5 items-center justify-center rounded-full bg-background text-[11px] font-bold text-foreground shadow-sm">
              {i + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
}
