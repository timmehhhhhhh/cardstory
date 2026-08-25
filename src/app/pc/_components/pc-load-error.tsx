"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Rendered in place of the item grid/gallery (and their EmptyHoldings
 * state) when the ["pc"] fetch itself failed — see usePCData's `pcsError`.
 * Deliberately distinct from EmptyHoldings: a failed fetch used to render
 * identically to "you genuinely have zero cards" (NZ$0.00, "Nothing here
 * yet"), which read as silent data loss. `message` is either the specific
 * server-provided reason (e.g. the stale-session 401's "sign in again", see
 * route-errors.ts) or a generic fallback; `onRetry` re-runs the query.
 */
export function PCLoadError({
  message,
  isStaleSession,
  onRetry,
}: {
  message: string;
  isStaleSession: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 py-16 text-center">
      <AlertCircle className="size-6 text-destructive" />
      <p className="font-medium">Couldn&apos;t load your collection</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {isStaleSession ? (
        <Button asChild size="sm" className="mt-2">
          <Link href="/login">Sign in again</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
