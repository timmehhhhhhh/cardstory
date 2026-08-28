"use client";

import { Button } from "@/components/ui/button";
import type { PageSummary } from "@/lib/binder-import/types";

/** Per-page counts + primary actions — mirrors src/app/scan/_components/batch-confirm-bar.tsx's shape for the Mass Scanner. */
export function ImportPageConfirmBar({
  summary,
  onConfirm,
  committing,
}: {
  summary: PageSummary;
  onConfirm: () => void;
  committing?: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium">Ready to place</p>
          <p className="text-muted-foreground">
            {summary.identified} identified · {summary.empty} empty
            {summary.unidentified > 0 ? ` · ${summary.unidentified} need ID` : ""}
            {summary.conflicts > 0 ? ` · ${summary.conflicts} conflict${summary.conflicts === 1 ? "" : "s"}` : ""}
            {summary.skipped > 0 ? ` · ${summary.skipped} skipped` : ""}
          </p>
        </div>
        <Button size="lg" disabled={summary.readyToCommit === 0 || committing} onClick={onConfirm}>
          {committing ? "Placing…" : `Confirm page — place ${summary.readyToCommit} card${summary.readyToCommit === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}
