import type { CSSProperties } from "react";

/**
 * Sizes a box to the largest it can be while keeping `aspectRatio` (width /
 * height) and fitting inside its parent — the same idea as `object-fit:
 * contain` on an `<img>`, but for an arbitrary element (a CSS grid, here),
 * where that property doesn't apply.
 *
 * Plain `aspect-ratio` + `max-width`/`height: 100%` can't do this alone:
 * once `max-width` clamps the width, the height — already definite from
 * `height: 100%` — doesn't shrink back down to match, so a wide ratio (a
 * 2-page landscape spread) overflows its container's height instead of
 * scaling down to fit. A JS ResizeObserver could compute the fitted pixel
 * size directly, but CSS container query units do the same thing without
 * JS (and without the "hasn't measured yet" flash on mount): `cqw`/`cqh`
 * are percentages of the nearest ancestor with `container-type`, so each
 * expression below independently resolves to whichever axis is the
 * limiting one, and both agree on the result.
 *
 * Pair `containerStyle()` on the parent with `containedBoxStyle()` on the
 * child that should fit inside it at `aspectRatio`.
 */
export function containerStyle(): CSSProperties {
  return { containerType: "size" };
}

export function containedBoxStyle(aspectRatio: number): CSSProperties {
  return {
    width: `min(100cqw, calc(100cqh * ${aspectRatio}))`,
    height: `min(100cqh, calc(100cqw / ${aspectRatio}))`,
  };
}
