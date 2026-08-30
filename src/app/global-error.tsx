"use client";

import { useEffect } from "react";

/**
 * Catches an exception thrown by the root layout itself (error.tsx can't
 * catch that — it renders inside the layout). Rare in practice, but without
 * this file that case falls all the way through to Next's bare built-in
 * error page, same opaque-digest problem this pair of files exists to fix
 * for the rest of the app. Must render its own <html>/<body> since it
 * replaces the root layout entirely while active.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled root layout error", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center text-foreground">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The app hit an unexpected error. Trying again usually clears it up.
        </p>
        {error.digest && <p className="text-xs text-muted-foreground/70">Reference: {error.digest}</p>}
        <button
          onClick={() => reset()}
          className="mt-2 rounded-lg border border-transparent bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
