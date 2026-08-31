import type { GameStatus, Sport } from "@prisma/client";
import type { GameProvider } from "@/lib/games/types";
import { pokemonProvider } from "@/lib/games/pokemon/client";
import { riftboundProvider } from "@/lib/games/riftbound/client";
import { fabProvider } from "@/lib/games/fab/client";

/**
 * Every TCG shown on the /sets page. `pokemon`, `riftbound`, and `fab` are
 * WIRED: pokemon has a free, no-key API with real, ToS-safe pricing
 * (pokemontcg.io); riftbound has a free, no-key catalog API (riftcodex.com)
 * but no pricing source yet, so its cards seed with no raw market price (see
 * lib/games/riftbound/mapper.ts); fab uses the free, no-key api.goagain.dev
 * catalog, scoped to just its promo sets rather than its whole retail
 * history (see lib/games/fab/client.ts) — also with no pricing source yet.
 * The rest render as visible "Coming soon" tiles for visual parity with the
 * real app's Sets grid; adding a real provider for one later just means
 * implementing `GameProvider` and flipping its status here + in the seed
 * script.
 *
 * `shortLabel` stands in for an official logo image: pokemontcg.io/Scryfall
 * give card art, not each publisher's trademarked logo, so the Sets grid
 * renders simple in-house typographic badges instead of reproducing
 * third-party trademarks.
 */
export interface GameMeta {
  id: string;
  name: string;
  shortLabel: string;
  status: GameStatus;
  sortOrder: number;
  /**
   * "tcg" (default when absent) means this id is backed by CatalogItem/Set,
   * seeded via a GameProvider. "sports" means it's backed by SportsCardItem
   * instead — no Set table, no GameProvider; see `sport` below and
   * lib/catalog/search.ts's sports branch.
   */
  kind?: "tcg" | "sports";
  /** Only set when kind === "sports" — links this registry id to the Sport enum. */
  sport?: Sport;
}

export const GAMES: GameMeta[] = [
  { id: "pokemon", name: "Pokémon", shortLabel: "PKMN", status: "WIRED", sortOrder: 0 },
  { id: "mtg", name: "Magic: The Gathering", shortLabel: "MTG", status: "COMING_SOON", sortOrder: 1 },
  { id: "yugioh", name: "Yu-Gi-Oh!", shortLabel: "YGO", status: "COMING_SOON", sortOrder: 2 },
  { id: "onepiece", name: "One Piece Card Game", shortLabel: "OP", status: "COMING_SOON", sortOrder: 3 },
  { id: "lorcana", name: "Disney Lorcana", shortLabel: "LOR", status: "COMING_SOON", sortOrder: 4 },
  { id: "fab", name: "Flesh and Blood", shortLabel: "FAB", status: "WIRED", sortOrder: 5 },
  { id: "riftbound", name: "Riftbound", shortLabel: "RB", status: "WIRED", sortOrder: 6 },
  { id: "dragonball-fw", name: "Dragon Ball Card Game", shortLabel: "DBCG", status: "COMING_SOON", sortOrder: 7 },
  { id: "digimon", name: "Digimon Card Game", shortLabel: "DIGI", status: "COMING_SOON", sortOrder: 8 },
  { id: "weiss-schwarz", name: "Weiss Schwarz", shortLabel: "W/S", status: "COMING_SOON", sortOrder: 9 },
  { id: "union-arena", name: "Union Arena", shortLabel: "UA", status: "COMING_SOON", sortOrder: 10 },
  { id: "starwars-unlimited", name: "Star Wars: Unlimited", shortLabel: "SWU", status: "COMING_SOON", sortOrder: 11 },
  { id: "sorcery", name: "Sorcery: Contested Realm", shortLabel: "SORC", status: "COMING_SOON", sortOrder: 12 },
  { id: "grand-archive", name: "Grand Archive", shortLabel: "GA", status: "COMING_SOON", sortOrder: 13 },
  { id: "final-fantasy", name: "Final Fantasy TCG", shortLabel: "FF", status: "COMING_SOON", sortOrder: 14 },
  { id: "dragonball-super", name: "Dragon Ball Super Card Game", shortLabel: "DBS", status: "COMING_SOON", sortOrder: 15 },
  { id: "gundam", name: "Gundam Card Game", shortLabel: "GUN", status: "COMING_SOON", sortOrder: 16 },
  { id: "hololive", name: "hololive Official Card Game", shortLabel: "HOLO", status: "COMING_SOON", sortOrder: 17 },
  { id: "metazoo", name: "MetaZoo", shortLabel: "MZ", status: "COMING_SOON", sortOrder: 18 },
  // Sports cards — backed by SportsCardItem, not CatalogItem/Set (see the
  // `kind`/`sport` doc on GameMeta above). Only basketball-nba is WIRED
  // today (LaMelo Ball's checklist, seeded by scripts/seed-lamelo-ball.ts);
  // the rest render as "Coming soon" tiles for visual parity with the TCG
  // list above, same convention as e.g. `mtg`/`yugioh` here.
  {
    id: "basketball-nba",
    name: "Basketball (NBA)",
    shortLabel: "NBA",
    status: "WIRED",
    sortOrder: 19,
    kind: "sports",
    sport: "NBA",
  },
  {
    id: "motorsport-f1",
    name: "Formula 1",
    shortLabel: "F1",
    status: "COMING_SOON",
    sortOrder: 20,
    kind: "sports",
    sport: "F1",
  },
  {
    id: "combat-ufc",
    name: "UFC / MMA",
    shortLabel: "UFC",
    status: "COMING_SOON",
    sortOrder: 21,
    kind: "sports",
    sport: "UFC",
  },
  {
    id: "tennis",
    name: "Tennis",
    shortLabel: "Tennis",
    status: "COMING_SOON",
    sortOrder: 22,
    kind: "sports",
    sport: "TENNIS",
  },
];

export const GAME_PROVIDERS: Record<string, GameProvider> = {
  pokemon: pokemonProvider,
  riftbound: riftboundProvider,
  fab: fabProvider,
};

/** WIRED games backed by SportsCardItem — see lib/catalog/search.ts. */
export const WIRED_SPORTS_GAMES: GameMeta[] = GAMES.filter(
  (g) => g.kind === "sports" && g.status === "WIRED"
);

/**
 * WIRED, CatalogItem/Set-backed TCGs — the games the admin "add missing
 * card" tool (src/app/settings/_components/admin-add-card.tsx,
 * src/app/api/admin/add-card/route.ts) offers. Scoped to WIRED because a
 * COMING_SOON game has no browsing UI to reach a hand-added card through,
 * and to non-sports because those are backed by SportsCardItem, not
 * CatalogItem/Set.
 */
export const ADMIN_MANUAL_ADD_GAMES: GameMeta[] = GAMES.filter(
  (g) => g.status === "WIRED" && g.kind !== "sports"
);

export function isWiredGame(gameId: string): boolean {
  return GAMES.find((g) => g.id === gameId)?.status === "WIRED";
}

export function getGameMeta(gameId: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === gameId);
}
