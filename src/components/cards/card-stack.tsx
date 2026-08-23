"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSwipeIndex } from "@/hooks/use-swipe-index";
import type { CardStack as CardStackData } from "@/lib/collections/stacks";

function DotIndicator({
  total,
  index,
  onSelect,
  className,
}: {
  total: number;
  index: number;
  onSelect: (i: number) => void;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label="Copy in stack" className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === index}
          aria-label={`Copy ${i + 1} of ${total}`}
          // Stopped at pointerdown, not just click: CardStack's own
          // onPointerDown/Up (bound on the ancestor that wraps this button)
          // would otherwise still see the press as a tap on the stack and
          // fire onActivate at the same time this button changes the index.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(i);
          }}
          className={cn(
            "size-1.5 rounded-full transition-colors",
            i === index ? "bg-primary" : "bg-foreground/30 hover:bg-foreground/50"
          )}
        />
      ))}
    </div>
  );
}

function ChevronButton({
  direction,
  onClick,
  className,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  className?: string;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous copy" : "Next copy"}
      // See DotIndicator's onPointerDown above — same reason.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex size-7 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur transition-opacity hover:bg-background/90 focus-visible:opacity-100",
        className
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

/**
 * The swipe/loop shell for a stack of duplicate cards — see
 * src/lib/collections/stacks.ts for how rows get grouped into one of these.
 * Renders exactly one face at a time (`faces[activeIndex]`, newest-first),
 * and doesn't own the face's own tile chrome (border/rounding/padding) —
 * that stays with the caller's own gallery-tile/row wrapper, since gallery
 * and list layouts differ enough that a shared wrapper would just get
 * fought with `!important`-style overrides.
 *
 * Swipe left/right cycles the front face in a continuous loop
 * (N → N+1 → … → 1 → N), same as dragging a real stack's top card aside.
 * A plain tap (no drag) calls `onActivate` — for a stack that means "open
 * this copy's card story", not the aggregate catalog page (see
 * card-story-dialog.tsx). Chevrons and dots are always rendered whenever
 * there's more than one face, so the gesture is never the only way in —
 * see the `gesture-alternative` UX rule.
 *
 * Gallery tiles overlay the chevrons/dots on the art itself (there's a
 * whole tile to spread them over); list rows are one thin strip wide, so
 * they get a compact control bar above the row instead — overlaying a wide
 * flex row would either sit on top of the price/actions column or float
 * disconnected from the thumbnail it controls.
 */
export function CardStack<T>({
  stack,
  renderFace,
  onActivate,
  variant,
  className,
}: {
  stack: CardStackData<T>;
  renderFace: (face: T, ctx: { index: number; total: number }) => React.ReactNode;
  /** Called on a plain tap/click of the active face — typically opens the card-story dialog. */
  onActivate?: (face: T, index: number) => void;
  /** Controls chevron/dot placement to fit either layout. */
  variant: "gallery" | "row";
  className?: string;
}) {
  const { faces } = stack;
  const total = faces.length;
  const { index, dragOffset, next, prev, goTo, handlers } = useSwipeIndex(total, (i) =>
    onActivate?.(faces[i], i)
  );

  const face = faces[index];

  if (total <= 1) {
    return <>{renderFace(face, { index: 0, total: 1 })}</>;
  }

  const dragStyle: React.CSSProperties = {
    transform: dragOffset ? `translateX(${dragOffset * 0.4}px)` : undefined,
    transition: dragOffset ? "none" : "transform 200ms ease-out",
  };

  if (variant === "row") {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex items-center gap-2 pl-1">
          <ChevronButton direction="prev" onClick={prev} />
          <DotIndicator total={total} index={index} onSelect={goTo} />
          <ChevronButton direction="next" onClick={next} />
          <span className="text-xs text-muted-foreground">{index + 1} of {total} copies</span>
        </div>
        <div className="touch-pan-y select-none" {...handlers} style={dragStyle}>
          {renderFace(face, { index, total })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group relative touch-pan-y select-none", className)} {...handlers} style={dragStyle}>
      {renderFace(face, { index, total })}

      {/* Overlaid on the art, hover-revealed like the existing gallery
          action buttons — matches item-gallery.tsx's convention so a stack
          doesn't introduce a second visual language for "controls on a tile". */}
      <ChevronButton
        direction="prev"
        onClick={prev}
        className="absolute top-1/2 left-1 z-20 -translate-y-1/2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      />
      <ChevronButton
        direction="next"
        onClick={next}
        className="absolute top-1/2 right-1 z-20 -translate-y-1/2 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      />
      <DotIndicator
        total={total}
        index={index}
        onSelect={goTo}
        className="absolute bottom-1.5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-background/70 px-1.5 py-1 backdrop-blur"
      />
    </div>
  );
}
