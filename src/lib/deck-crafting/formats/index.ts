import { RIFTBOUND_CONSTRUCTED } from "@/lib/deck-crafting/formats/riftbound";
import { FAB_FORMATS } from "@/lib/deck-crafting/formats/fab";
import { POKEMON_FORMATS } from "@/lib/deck-crafting/formats/pokemon";
import type { DeckFormat } from "@/lib/deck-crafting/formats/types";

export type { DeckFormat, DeckSection, CopyLimitRule, CombinedCountRule } from "@/lib/deck-crafting/formats/types";

/**
 * Every deck-buildable format, across every game Deck Crafting supports
 * today — Riftbound, FAB, and Pokémon (the only games with a real, WIRED
 * catalog — see src/lib/games/registry.ts). Adding a game here is a data
 * change (a new formats/<game>.ts file), not a rewrite of the deck builder.
 */
export const DECK_FORMATS: DeckFormat[] = [RIFTBOUND_CONSTRUCTED, ...FAB_FORMATS, ...POKEMON_FORMATS];

/** Games with at least one buildable format — drives the "pick a game" step of the New Deck wizard. */
export function getDeckCraftingGameIds(): string[] {
  return Array.from(new Set(DECK_FORMATS.map((f) => f.gameId)));
}

export function getFormatsForGame(gameId: string): DeckFormat[] {
  return DECK_FORMATS.filter((f) => f.gameId === gameId);
}

export function getFormat(formatId: string): DeckFormat | undefined {
  return DECK_FORMATS.find((f) => f.id === formatId);
}
