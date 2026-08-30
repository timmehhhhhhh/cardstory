"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary for everything under the root layout. Before
 * this file existed, an unhandled exception anywhere in the app fell
 * through to Next's bare built-in error page — no message, just an opaque
 * `Digest: <number>`, which is what surfaced for the "Touch Change!" card
 * detail page investigation. This at least gives the user something
 * actionable and a way back, and logs the real error (with its digest) to
 * the console so it's findable in server/edge logs.
 */
export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page hit an unexpected error. Trying again usually clears it up.
      </p>
      {error.digest && <p className="text-xs text-muted-foreground/70">Reference: {error.digest}</p>}
      <div className="mt-2 flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
