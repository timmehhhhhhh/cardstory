import { cn } from "@/lib/utils";

/**
 * A card's number within its set (e.g. "88", "025/198"), rendered as a
 * small non-truncatable badge. Sports cards and many Pokémon prints are
 * otherwise visually near-identical, so this needs to stay legible even
 * when it sits next to a long set/player name — never bury it inside a
 * `truncate`d caption line.
 *
 * - `overlay`: absolute-positioned chip for image-first tiles (grid cards,
 *   binder pockets). Pair with a `relative` ancestor and position via
 *   `className` (e.g. `"left-1.5 top-1.5"`) — top-right is already used by
 *   add/watchlist buttons on most tiles, so top-left is the default spot.
 * - `inline`: a static pill for list rows, meant to sit as a flex-none
 *   sibling next to the card name, outside any `truncate` container.
 */
export function CardNumberBadge({
  number,
  variant = "inline",
  className,
}: {
  number: string | null | undefined;
  variant?: "overlay" | "inline";
  className?: string;
}) {
  if (!number) return null;
  return (
    <span
      className={cn(
        "num-tabular inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground bg-surface-elevated border border-border",
        variant === "overlay" && "absolute z-10 left-1.5 top-1.5 bg-background/80 backdrop-blur border-none",
        className
      )}
    >
      #{number}
    </span>
  );
}
