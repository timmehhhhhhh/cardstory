"use client";

import Link from "next/link";
import { usePCStore } from "@/lib/pc/store";

/**
 * The "no holdings match" state, shared by every way of rendering a pc's
 * items (ItemGrid's rows, ItemGallery's tiles). Lives outside both so
 * switching view mode never changes what an empty collection says.
 *
 * Reads `pcsError` straight from the store rather than taking it as a prop —
 * a failed `GET /api/pc` (network error, stale session, server error) leaves
 * `pcs` at React Query's empty-array default, which otherwise renders
 * pixel-identical to "you truly have zero cards." Without this check, a
 * transient server error reads to the user as their whole collection having
 * vanished (see the 2026-08-26 PC-cards-missing incident, caused by a
 * schema-drift 500 from `GET /api/pc`).
 */
export function EmptyHoldings() {
  const pcsError = usePCStore((s) => s.pcsError);

  if (pcsError) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-destructive/50 py-16 text-center">
        <p className="font-medium text-destructive">Couldn&apos;t load your PC</p>
        <p className="text-sm text-muted-foreground">
          Your cards are still there — this is just a loading problem. Try{" "}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-primary hover:underline"
          >
            reloading the page
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
      <p className="font-medium">Nothing here yet</p>
      <p className="text-sm text-muted-foreground">
        Head to <Link href="/explore" className="text-primary hover:underline">Explore</Link> and add a
        card.
      </p>
    </div>
  );
}
