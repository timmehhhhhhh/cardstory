import type { Metadata } from "next";
import { GameLogoGrid } from "@/app/sets/_components/game-logo-grid";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Sets" };

export default async function SetsPage() {
  await requireSession();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <h1 className="mb-1 text-lg font-semibold">Categories &amp; Card Sets</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Pokémon, Riftbound, and Basketball (NBA) are fully live. Everything else is on the roadmap.
      </p>
      <GameLogoGrid />
    </div>
  );
}
