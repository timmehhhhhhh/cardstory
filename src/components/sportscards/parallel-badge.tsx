import { cn } from "@/lib/utils";

/**
 * Names the parallel a sports card actually is, watermarked over its photo.
 *
 * This exists because of how sports images are sourced. A checklist group
 * (year + distributor + set + card number) has one photo, and every parallel
 * in that group — Silver, Gold /10, Ruby Wave /25 — is seeded with that same
 * base-card photo, because no per-parallel scan is available for them (see
 * scripts/data/lamelo-ball/images.ts). The photo is therefore correct about
 * *which card* this is and wrong about its foil treatment.
 *
 * Without the watermark a user looking at their Gold /10 would see an
 * unlabelled base-card scan and reasonably read it as the parallel's own
 * image. With it, the tile states what the copy is and what the photo isn't.
 *
 * `inherited` is `SportsCardItem.imageIsInherited` — true when the photo came
 * from the group's base card rather than this exact printing.
 */
export function ParallelBadge({
  parallelName,
  serialLimit,
  inherited = false,
  className,
}: {
  parallelName: string | null | undefined;
  serialLimit: string | null | undefined;
  inherited?: boolean;
  className?: string;
}) {
  // A base card with no parallel name has nothing to disambiguate.
  if (!parallelName) return null;

  const label = serialLimit ? `${parallelName} /${serialLimit}` : parallelName;

  return (
    <span
      className={cn(
        // line-clamp-2 rather than truncate: a one-line ellipsis was
        // swallowing whole parallel names ("Kaboom! Downtown Fireworks
        // Gold Vinyl /10") that are exactly what this badge exists to
        // surface — see the file doc comment. Two lines of 10px text
        // still reads as a compact strip over the photo.
        "pointer-events-none absolute inset-x-0 bottom-0 z-10 line-clamp-2 bg-background/75 px-1.5 py-0.5 text-center text-[10px] leading-tight font-semibold tracking-wide text-foreground backdrop-blur",
        className
      )}
      title={
        inherited
          ? `${label} — photo shown is the base card; no scan of this parallel is available`
          : label
      }
    >
      {label}
    </span>
  );
}
