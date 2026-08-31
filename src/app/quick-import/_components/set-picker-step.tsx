"use client";

import { ArrowLeft } from "lucide-react";
import type { SetMatchCandidate } from "@/lib/quick-import/match-set";

/**
 * Shown when the dictated set name doesn't confidently resolve to one set
 * (see isConfidentMatch in lib/quick-import/match-set.ts) — e.g. "wizards
 * black star promo" against a real set name like "WOTC Black Star Promos"
 * has enough token overlap to fuzzy-match, but not enough to auto-pick
 * safely. Presents the top few ranked candidates for one tap instead of
 * silently guessing wrong.
 */
export function SetPickerStep({
  candidates,
  onPick,
  onBack,
}: {
  candidates: SetMatchCandidate[];
  onPick: (set: { id: string; name: string }) => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-8">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Try again
      </button>
      <p className="text-sm text-muted-foreground">Which set did you mean?</p>
      <div className="flex flex-col gap-2">
        {candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick({ id: c.id, name: c.name })}
            className="rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm font-medium hover:border-primary/40 hover:bg-surface-elevated"
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
