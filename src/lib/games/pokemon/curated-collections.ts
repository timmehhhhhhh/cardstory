// Relative, not "@/..." — see the same note atop lib/games/pokemon/mapper.ts.
import { POKEMON_SPECIES_NAMES } from "../../../../scripts/data/pokemon-species-names";

/**
 * Built-in "quick-start" Pokémon collections for the Curated Sets builder
 * (src/app/curated-sets/_components/curated-set-builder.tsx). Picking one
 * pre-fills CuratedSetFilters.nationalPokedexNumbers with `dexNumbers()` and
 * sets `groupByNationalPokedexNumber: true` — the resulting curated set
 * tracks "own at least one card for each of these species," resolved via
 * resolveCuratedSetSpeciesMatches (src/lib/catalog/search.ts). Every number
 * below is verified against POKEMON_SPECIES_NAMES.EN's index-aligned order
 * (index 0 = National Dex #1), not hand-typed from memory.
 */
export interface PokemonCuratedCollectionTemplate {
  id: "living_dex" | "eeveelutions" | "starters";
  label: string;
  description: string;
  dexNumbers: () => number[];
}

export const POKEMON_CURATED_COLLECTION_TEMPLATES: PokemonCuratedCollectionTemplate[] = [
  {
    id: "living_dex",
    label: "Living Dex",
    description: "One card for every Pokémon species, #0001 through the newest.",
    // Always current, not a fixed 1025/1028 — grows automatically as new
    // generations are added to scripts/data/pokemon-species-names.ts.
    dexNumbers: () => Array.from({ length: POKEMON_SPECIES_NAMES.EN.length }, (_, i) => i + 1),
  },
  {
    id: "eeveelutions",
    label: "Eeveelutions",
    description: "Eevee and all of its evolutions.",
    // Eevee, Vaporeon, Jolteon, Flareon, Espeon, Umbreon, Leafeon, Glaceon, Sylveon
    dexNumbers: () => [133, 134, 135, 136, 196, 197, 470, 471, 700],
  },
  {
    id: "starters",
    label: "All Starter Pokémon",
    description: "Every generation's grass/fire/water first-partner trio.",
    dexNumbers: () => [
      1, 4, 7, // Gen 1: Bulbasaur, Charmander, Squirtle
      152, 155, 158, // Gen 2: Chikorita, Cyndaquil, Totodile
      252, 255, 258, // Gen 3: Treecko, Torchic, Mudkip
      387, 390, 393, // Gen 4: Turtwig, Chimchar, Piplup
      495, 498, 501, // Gen 5: Snivy, Tepig, Oshawott
      650, 653, 656, // Gen 6: Chespin, Fennekin, Froakie
      722, 725, 728, // Gen 7: Rowlet, Litten, Popplio
      810, 813, 816, // Gen 8: Grookey, Scorbunny, Sobble
      906, 909, 912, // Gen 9: Sprigatito, Fuecoco, Quaxly
    ],
  },
];

/** National Dex number -> English species name, for builder preview chips. */
export function pokemonSpeciesNameForDexNumber(n: number): string {
  return POKEMON_SPECIES_NAMES.EN[n - 1] ?? `#${n}`;
}
