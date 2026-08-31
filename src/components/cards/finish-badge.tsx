import { cn } from "@/lib/utils";

/**
 * A card's priced finish/variation (Holofoil, Reverse Holo, 1st Edition
 * Holo, ...), rendered as a small colored chip — deliberately a bolder
 * background-chip style than the text-only `RarityBadge`/`CardNumberBadge`
 * pattern, because the whole point of this badge is to make two otherwise
 * visually-identical tiles (e.g. the Holofoil and Reverse Holo of the same
 * card sitting side-by-side in Explore) distinguishable at a glance, not
 * just on close reading.
 *
 * Colored by finish *family* rather than exact key, so the palette stays
 * meaningful as more curated per-set pattern labels (see
 * lib/games/pokemon/finish-patterns.ts) get added later — a "Cracked Ice
 * Holo" tile still reads as the same family as every other reverse holo.
 *
 * - `overlay`: absolute-positioned chip for image-first tiles (grid cards).
 *   Pair with a `relative` ancestor and position via `className`.
 * - `inline`: a static pill for list rows / detail pages, meant to sit as a
 *   flex-none sibling next to other badges.
 */

// Each pair is a near-opaque colored fill + a text color chosen so contrast
// holds at ~4.5:1+ even in the worst case — the `overlay` variant sits
// directly on top of arbitrary card artwork (see `variant` doc below), so
// the fill can't rely on a themed surface color for contrast the way most
// badges do. Values were picked and contrast-checked (alpha-blended over
// both pure white and pure black "art") rather than left at full saturation
// with same-hue tinted backgrounds, which read as illegible on holo/foil art
// of a similar hue (e.g. pink Cosmos Holo text vanishing on pink card art).
const FINISH_FAMILY_COLOR: Record<string, string> = {
  holofoil: "bg-[#5a3fe0]/55 text-white border-white/15 backdrop-blur",
  unlimitedHolofoil: "bg-[#5a3fe0]/55 text-white border-white/15 backdrop-blur",
  reverseHolofoil: "bg-[#2fb5c9]/55 text-[#0d2b30] border-black/15 backdrop-blur",
  "1stEdition": "bg-[#d9a441]/55 text-[#2c1d05] border-black/15 backdrop-blur",
  "1stEditionNormal": "bg-[#d9a441]/55 text-[#2c1d05] border-black/15 backdrop-blur",
  "1stEditionHolofoil": "bg-[#d9a441]/55 text-[#2c1d05] border-black/15 backdrop-blur",
  "1stEditionUnlimited": "bg-[#d9a441]/55 text-[#2c1d05] border-black/15 backdrop-blur",
  // Its own color, distinct from reverseHolofoil's teal above — see
  // FINISH_LABELS.cosmosHolo in lib/games/pokemon/mapper.ts for why this is
  // a separate variantKey rather than a reverseHolofoil display overlay.
  cosmosHolo: "bg-[#9c3f74]/55 text-white border-white/15 backdrop-blur",
};
const DEFAULT_FINISH_COLOR = "bg-surface-elevated/60 text-muted-foreground border-border";

export function FinishBadge({
  variantKey,
  label,
  variant = "inline",
  className,
}: {
  variantKey: string | null | undefined;
  label: string | null | undefined;
  variant?: "overlay" | "inline";
  className?: string;
}) {
  if (!variantKey || !label) return null;
  const color = FINISH_FAMILY_COLOR[variantKey] ?? DEFAULT_FINISH_COLOR;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide border",
        color,
        variant === "overlay" && "absolute z-10",
        className
      )}
    >
      {label}
    </span>
  );
}
