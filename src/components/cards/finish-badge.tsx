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

const FINISH_FAMILY_COLOR: Record<string, string> = {
  holofoil: "bg-[#7c5cff]/15 text-[#7c5cff] border-[#7c5cff]/30",
  unlimitedHolofoil: "bg-[#7c5cff]/15 text-[#7c5cff] border-[#7c5cff]/30",
  reverseHolofoil: "bg-[#2fb5c9]/15 text-[#2fb5c9] border-[#2fb5c9]/30",
  "1stEdition": "bg-[#d9a441]/15 text-[#d9a441] border-[#d9a441]/30",
  "1stEditionNormal": "bg-[#d9a441]/15 text-[#d9a441] border-[#d9a441]/30",
  "1stEditionHolofoil": "bg-[#d9a441]/15 text-[#d9a441] border-[#d9a441]/30",
  "1stEditionUnlimited": "bg-[#d9a441]/15 text-[#d9a441] border-[#d9a441]/30",
  // Its own color, distinct from reverseHolofoil's teal above — see
  // FINISH_LABELS.cosmosHolo in lib/games/pokemon/mapper.ts for why this is
  // a separate variantKey rather than a reverseHolofoil display overlay.
  cosmosHolo: "bg-[#c45b9e]/15 text-[#c45b9e] border-[#c45b9e]/30",
};
const DEFAULT_FINISH_COLOR = "bg-surface-elevated text-muted-foreground border-border";

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
        variant === "overlay" && "absolute z-10 backdrop-blur",
        className
      )}
    >
      {label}
    </span>
  );
}
