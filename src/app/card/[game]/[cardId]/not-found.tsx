import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Rendered by Next when this route's page.tsx calls notFound() — e.g. a
 * catalog id that doesn't exist yet (not seeded, mistyped, or a stale
 * link). Without this file, Next falls back to zero UI for the not-found
 * case, which on some deployment targets surfaces as an opaque generic
 * error page instead of a real 404 — see the "Touch Change!" investigation
 * that added this file for the concrete case that prompted it.
 */
export default function CardNotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
      <h1 className="text-xl font-bold">Card not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        We couldn&apos;t find a card at this address. It may not be in the catalog yet, or the link may be
        out of date.
      </p>
      <div className="mt-2 flex gap-2">
        <Button asChild>
          <Link href="/explore">Browse Explore</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
