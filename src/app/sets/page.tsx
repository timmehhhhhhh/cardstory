import type { Metadata } from "next";
import { GameLogoGrid } from "@/app/sets/_components/game-logo-grid";

export const metadata: Metadata = { title: "Sets" };

export default function SetsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <h1 className="mb-1 text-lg font-semibold">TCG Categories &amp; Card Sets</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Pokémon and Magic: The Gathering are fully live. Everything else is on the roadmap.
      </p>
      <GameLogoGrid />
    </div>
  );
}
