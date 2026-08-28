"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { BatchSummary } from "@/lib/scan-cards/review-state";

/**
 * Sticky "Ready to add" bar above the batch commit action. When any checked
 * card still needsReview, the primary action reads "Review N cards first"
 * and requires an explicit second "Add anyway" tap — a reviewer can never
 * commit an unresolved low-confidence card by accident (see this feature's
 * plan's "never silently commit unresolved cards" requirement).
 */
export function BatchConfirmBar({
  summary,
  onCommit,
  committing,
}: {
  summary: BatchSummary;
  onCommit: () => void;
  committing?: boolean;
}) {
  const [confirmedAnyway, setConfirmedAnyway] = React.useState(false);
  const blockedByReview = summary.readyButNeedsReview > 0 && !confirmedAnyway;

  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium">Ready to add</p>
          <p className="text-muted-foreground">
            {summary.detected} card{summary.detected === 1 ? "" : "s"} detected · {summary.highConfidence} high
            confidence · {summary.needsReview} need review
            {summary.skipped > 0 ? ` · ${summary.skipped} skipped` : ""}
          </p>
        </div>
        <Button
          size="lg"
          disabled={summary.readyToCommit === 0 || committing}
          onClick={() => {
            if (blockedByReview) {
              setConfirmedAnyway(true);
              return;
            }
            onCommit();
          }}
        >
          {committing
            ? "Adding…"
            : blockedByReview
              ? `Review ${summary.readyButNeedsReview} more, or Add anyway`
              : `Add ${summary.readyToCommit} card${summary.readyToCommit === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}
