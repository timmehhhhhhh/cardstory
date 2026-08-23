"use client";

import * as React from "react";

/**
 * Drives a looping index (0..count-1) from horizontal pointer drags — the
 * "swipe right on the top card of the stack to cycle to the next one"
 * interaction. Pointer Events cover touch, mouse and pen in one listener set
 * (no separate touch/mouse handling needed), and a real drag threshold
 * (rather than any horizontal movement) keeps an ordinary tap from being
 * misread as a swipe — and vice versa: a drag that never crosses the
 * threshold fires `onTap(index)` instead of changing the index, so the same
 * gesture area can both swipe the stack and open the card-story dialog.
 *
 * Deliberately hand-rolled rather than pulling in a carousel/gesture
 * library: this app has no such dependency yet (see item-gallery.tsx/
 * item-grid.tsx), and the only gesture needed here — one-axis drag past a
 * threshold, wrap on release, tap otherwise — doesn't warrant adding one.
 */
export function useSwipeIndex(count: number, onTap?: (index: number) => void) {
  const [index, setIndex] = React.useState(0);
  const [dragOffset, setDragOffset] = React.useState(0);
  const dragStateRef = React.useRef<{ pointerId: number; startX: number; startY: number } | null>(null);

  const wrap = React.useCallback((n: number) => (count === 0 ? 0 : ((n % count) + count) % count), [count]);

  // Clamp when the underlying stack shrinks (e.g. a face gets removed while
  // it's active) rather than pointing past the end of a shorter array.
  // Adjusted during render rather than an effect — same "compare a stable
  // primitive, not re-derive in an effect" pattern as pc-client.tsx's
  // activePCId tracking — so it settles in the same render count changes
  // instead of committing a stale index for one extra frame.
  const [prevCount, setPrevCount] = React.useState(count);
  if (count !== prevCount) {
    setPrevCount(count);
    setIndex(wrap(index));
  }

  const next = React.useCallback(() => setIndex((i) => wrap(i + 1)), [wrap]);
  const prev = React.useCallback(() => setIndex((i) => wrap(i - 1)), [wrap]);
  const goTo = React.useCallback((n: number) => setIndex(wrap(n)), [wrap]);

  const DRAG_THRESHOLD = 40;
  // Above this, a pointer move is read as a scroll/drag attempt even if it
  // never crosses DRAG_THRESHOLD — without it, a shaky tap could still fire
  // onTap despite having moved the pointer several pixels.
  const TAP_TOLERANCE = 8;

  const handlers = React.useMemo(
    () => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button !== undefined && e.button !== 0) return;
        dragStateRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: React.PointerEvent) => {
        const drag = dragStateRef.current;
        if (!drag || drag.pointerId !== e.pointerId || count <= 1) return;
        setDragOffset(e.clientX - drag.startX);
      },
      onPointerUp: (e: React.PointerEvent) => {
        const drag = dragStateRef.current;
        dragStateRef.current = null;
        if (!drag || drag.pointerId !== e.pointerId) return;
        const deltaX = e.clientX - drag.startX;
        const deltaY = e.clientY - drag.startY;
        setDragOffset(0);
        if (count > 1 && deltaX <= -DRAG_THRESHOLD) next();
        else if (count > 1 && deltaX >= DRAG_THRESHOLD) prev();
        else if (Math.abs(deltaX) <= TAP_TOLERANCE && Math.abs(deltaY) <= TAP_TOLERANCE) onTap?.(index);
      },
      onPointerCancel: () => {
        dragStateRef.current = null;
        setDragOffset(0);
      },
    }),
    [count, next, prev, onTap, index]
  );

  return { index, dragOffset, next, prev, goTo, handlers };
}
