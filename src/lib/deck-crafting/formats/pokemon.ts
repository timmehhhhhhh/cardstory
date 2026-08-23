import type { DeckFormat, DeckSection } from "@/lib/deck-crafting/formats/types";

/**
 * cardType here relies on the Pokémon mapper backfill (see
 * lib/games/pokemon/mapper.ts) that maps pokemontcg.io's `supertype` +
 * `subtypes` into CatalogItem.cardType as e.g. "Pokémon · Basic", "Trainer",
 * "Energy · Basic". Cards seeded before that backfill (or any card whose
 * cardType is still null) won't match any section here — validate.ts
 * surfaces those as "unclassified" rather than silently misplacing them.
 */

const STANDARD_SECTIONS: DeckSection[] = [
  {
    id: "basic-pokemon",
    label: "Basic Pokémon",
    min: 1,
    max: null,
    cardTypeContains: ["Pokémon · Basic"],
  },
  {
    id: "pokemon",
    label: "Other Pokémon",
    min: 0,
    max: null,
    cardTypeContains: ["Pokémon"],
    excludeCardTypeContains: ["Basic"],
  },
  {
    id: "trainer",
    label: "Trainer",
    min: 0,
    max: null,
    cardTypeContains: ["Trainer"],
  },
  {
    id: "energy",
    label: "Energy",
    min: 0,
    max: null,
    cardTypeContains: ["Energy"],
  },
];

/** Standard format. Source: JustInBasil's limits guide (https://www.justinbasil.com/guide/limits) and pokemon.com's deckbuilding article (https://www.pokemon.com/us/strategy/designing-a-deck-from-scratch). */
export const POKEMON_STANDARD: DeckFormat = {
  id: "pokemon-standard",
  gameId: "pokemon",
  label: "Standard",
  description: "The current rotating 60-card format, using only recently regulation-marked sets.",
  sections: STANDARD_SECTIONS.map((s) => ({ ...s })),
  combinedCounts: [
    {
      id: "deck-total",
      label: "Deck (exactly 60 cards)",
      sections: ["basic-pokemon", "pokemon", "trainer", "energy"],
      min: 60,
      max: 60,
    },
  ],
  copyLimit: {
    max: 4,
    appliesToSections: ["basic-pokemon", "pokemon", "trainer", "energy"],
    // Basic Energy is uncapped — "ex"/"V"/"VMAX"/"VSTAR" suffixes are part
    // of the card's official name so those variants are already distinct
    // names and don't need a separate exemption.
    exemptCardTypeContains: ["Energy · Basic"],
  },
  bannedCardNames: [],
  informationalRules: [
    "Standard is restricted to cards with a current regulation mark — older sets rotate out periodically; not automatically checked here (see pokemon.com's rotation announcements).",
  ],
};

/** Expanded format. Same deck-construction rules as Standard, just a much larger legal card pool (Black & White era onward) — this app doesn't distinguish card legal-set membership yet, so its section/copy rules are identical; only the banlist differs. */
export const POKEMON_EXPANDED: DeckFormat = {
  id: "pokemon-expanded",
  gameId: "pokemon",
  label: "Expanded",
  description: "A larger, non-rotating 60-card format (Black & White-era sets onward).",
  sections: STANDARD_SECTIONS.map((s) => ({ ...s })),
  combinedCounts: [
    {
      id: "deck-total",
      label: "Deck (exactly 60 cards)",
      sections: ["basic-pokemon", "pokemon", "trainer", "energy"],
      min: 60,
      max: 60,
    },
  ],
  copyLimit: {
    max: 4,
    appliesToSections: ["basic-pokemon", "pokemon", "trainer", "energy"],
    exemptCardTypeContains: ["Energy · Basic"],
  },
  bannedCardNames: [
    // Refresh against Pokémon's official Expanded banlist page.
    "Archeops",
    "Chip-Chip Ice Axe",
    "Delinquent",
    "Lt. Surge's Strategy",
    "Lysandre's Trump Card",
    "Marshadow",
    "Maxie's Hidden Ball Trick",
    "Unown",
  ],
  informationalRules: [],
};

export const POKEMON_FORMATS: DeckFormat[] = [POKEMON_STANDARD, POKEMON_EXPANDED];
