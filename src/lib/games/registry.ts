import type { GameStatus } from "@prisma/client";
import type { GameProvider } from "@/lib/games/types";
import { pokemonProvider } from "@/lib/games/pokemon/client";
import { mtgProvider } from "@/lib/games/mtg/client";

/**
 * Every TCG shown on the /sets page. Only `pokemon` and `mtg` are WIRED —
 * both have free, no-key APIs with real, ToS-safe pricing (pokemontcg.io,
 * Scryfall). The rest render as visible "Coming soon" tiles for visual
 * parity with the real app's Sets grid; adding a real provider for one
 * later just means implementing `GameProvider` and flipping its status
 * here + in the seed script.
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
}

export const GAMES: GameMeta[] = [
  { id: "pokemon", name: "Pokémon", shortLabel: "PKMN", status: "WIRED", sortOrder: 0 },
  { id: "mtg", name: "Magic: The Gathering", shortLabel: "MTG", status: "WIRED", sortOrder: 1 },
  { id: "yugioh", name: "Yu-Gi-Oh!", shortLabel: "YGO", status: "COMING_SOON", sortOrder: 2 },
  { id: "onepiece", name: "One Piece Card Game", shortLabel: "OP", status: "COMING_SOON", sortOrder: 3 },
  { id: "lorcana", name: "Disney Lorcana", shortLabel: "LOR", status: "COMING_SOON", sortOrder: 4 },
  { id: "fab", name: "Flesh and Blood", shortLabel: "FAB", status: "COMING_SOON", sortOrder: 5 },
  { id: "riftbound", name: "Riftbound", shortLabel: "RB", status: "COMING_SOON", sortOrder: 6 },
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
];

export const GAME_PROVIDERS: Record<string, GameProvider> = {
  pokemon: pokemonProvider,
  mtg: mtgProvider,
};

export function isWiredGame(gameId: string): boolean {
  return GAMES.find((g) => g.id === gameId)?.status === "WIRED";
}

export function getGameMeta(gameId: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === gameId);
}
