"use client";

import { ADMIN_MANUAL_ADD_GAMES, WIRED_SPORTS_GAMES } from "@/lib/games/registry";

// Every WIRED game — Set-backed TCGs (Pokémon, FAB, Riftbound) plus
// SportsCardItem-backed sports (Basketball/NBA) — reusing the same "WIRED,
// has a real catalog to search" filters the rest of the app already applies
// (see ADMIN_MANUAL_ADD_GAMES/WIRED_SPORTS_GAMES doc comments in
// lib/games/registry.ts). A COMING_SOON game has no seeded catalog to
// quick-import from.
const GAMES = [...ADMIN_MANUAL_ADD_GAMES, ...WIRED_SPORTS_GAMES].sort(
  (a, b) => a.sortOrder - b.sortOrder
);

export function GameSelectStep({ onPick }: { onPick: (gameId: string) => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
      <div className="text-center">
        <h1 className="font-heading text-xl font-semibold">Quick Import</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a game, then dictate the set name and card number to quick-add cards one after another
          — hands-free.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {GAMES.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onPick(g.id)}
            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface px-3 py-4 text-center hover:border-primary/40 hover:bg-surface-elevated"
          >
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {g.shortLabel}
            </span>
            <span className="text-sm font-medium">{g.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
