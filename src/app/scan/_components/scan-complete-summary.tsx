"use client";

import Link from "next/link";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BatchHoldingResult } from "@/lib/pc/manage";

export interface CommitOutcomeRow extends BatchHoldingResult {
  name: string;
  setName: string;
}

/**
 * Final step: what actually landed in the user's PC, broken down by
 * outcome — never just "done", since a batch write can partially fail (see
 * addHoldingsBatch in src/lib/pc/manage.ts) and the user needs to know
 * exactly which cards to double-check.
 */
export function ScanCompleteSummary({
  rows,
  skippedCount,
  onRetryFailed,
  onScanMore,
  retryingFailed,
}: {
  rows: CommitOutcomeRow[];
  skippedCount: number;
  onRetryFailed: () => void;
  onScanMore: () => void;
  retryingFailed?: boolean;
}) {
  const created = rows.filter((r) => r.status === "created");
  const failed = rows.filter((r) => r.status === "failed");

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-lg font-semibold">
          Added {created.length} card{created.length === 1 ? "" : "s"} to your collection
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {failed.length > 0 && `${failed.length} card${failed.length === 1 ? "" : "s"} failed to save. `}
          {skippedCount > 0 && `${skippedCount} card${skippedCount === 1 ? "" : "s"} skipped.`}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2"
          >
            {r.status === "created" ? (
              <CheckCircle2 className="size-4 flex-none text-positive" />
            ) : (
              <XCircle className="size-4 flex-none text-negative" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.status === "created" ? r.setName : (r.error ?? "Couldn't save this card")}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {failed.length > 0 && (
          <Button variant="outline" onClick={onRetryFailed} disabled={retryingFailed}>
            <RotateCcw className="size-4" /> {retryingFailed ? "Retrying…" : `Retry ${failed.length} failed`}
          </Button>
        )}
        <Button variant="outline" onClick={onScanMore}>
          Scan more cards
        </Button>
        <Button asChild>
          <Link href="/pc">View collection</Link>
        </Button>
      </div>
    </div>
  );
}
