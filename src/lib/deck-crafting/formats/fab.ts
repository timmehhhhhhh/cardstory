import type { DeckFormat } from "@/lib/deck-crafting/formats/types";

/**
 * cardType here is goagain's free-text type_text (see
 * lib/games/fab/mapper.ts), e.g. "Hero", "Young Hero", "Equipment",
 * "Weapon", "Action - Attack", "Instant - Attack Reaction" — messier than
 * Riftbound's clean type/supertype pair, so section matching is a
 * best-effort substring test; heroes' "Young" subtype and Legendary/Living
 * Legend status are text on the card, not a structured field, so those
 * eligibility rules are informational only (see informationalRules).
 */

/**
 * Classic Constructed. Source: fabtcg.com's format page
 * (https://fabtcg.com/gameplay-formats/classic-constructed/).
 */
export const FAB_CLASSIC_CONSTRUCTED: DeckFormat = {
  id: "fab-classic-constructed",
  gameId: "fab",
  label: "Classic Constructed",
  description: "FAB's primary constructed format: an 80-card pool, 60-card minimum starting deck.",
  sections: [
    {
      id: "hero",
      label: "Hero",
      min: 1,
      max: 1,
      cardTypeContains: ["Hero"],
    },
    {
      id: "weapon",
      label: "Weapons",
      min: 0,
      max: null,
      cardTypeContains: ["Weapon"],
    },
    {
      id: "equipment",
      label: "Equipment",
      min: 0,
      max: null,
      cardTypeContains: ["Equipment"],
    },
    {
      id: "main",
      label: "Deck (60-card minimum)",
      min: 60,
      max: null,
      cardTypeContains: null,
      excludeCardTypeContains: ["Hero", "Weapon", "Equipment"],
    },
    {
      id: "sideboard",
      label: "Sideboard",
      min: 0,
      max: null,
      cardTypeContains: null,
      excludeCardTypeContains: ["Hero"],
    },
  ],
  combinedCounts: [
    {
      id: "pool-total",
      label: "Card Pool (Deck + Weapons + Equipment + Sideboard)",
      sections: ["weapon", "equipment", "main", "sideboard"],
      min: 0,
      max: 80,
    },
  ],
  copyLimit: {
    max: 3,
    appliesToSections: ["weapon", "equipment", "main", "sideboard"],
  },
  bannedCardNames: [
    // Refresh against fabtcgmeta.com/en/banned-restricted/ — sampled current
    // Classic Constructed bans/suspensions as of this writing.
    "Awakening",
    "Autumn's Touch",
    "Bloodsheath Skeleta",
  ],
  informationalRules: [
    "Living Legend heroes (1000+ living legend points) and their signature weapons, Young heroes, and Pit-Fighter heroes are not legal in Classic Constructed — not automatically checked here.",
    "A card can only be included if its class/talent is a subset of your Hero's — not automatically checked here.",
    "Cards marked \"Legendary\" are capped at 1 copy regardless of the format's normal 3-copy limit — not automatically checked here.",
  ],
};

/**
 * Blitz. Source: fabtcg.com's format page
 * (https://fabtcg.com/gameplay-formats/blitz/).
 */
export const FAB_BLITZ: DeckFormat = {
  id: "fab-blitz",
  gameId: "fab",
  label: "Blitz",
  description: "FAB's 2-player, single-life-total format: a 52-card pool, exactly 40 cards in the starting deck.",
  sections: [
    {
      id: "hero",
      label: "Young Hero",
      min: 1,
      max: 1,
      cardTypeContains: ["Hero"],
    },
    {
      id: "weapon",
      label: "Weapons",
      min: 0,
      max: null,
      cardTypeContains: ["Weapon"],
    },
    {
      id: "equipment",
      label: "Equipment",
      min: 0,
      max: null,
      cardTypeContains: ["Equipment"],
    },
    {
      id: "main",
      label: "Deck (exactly 40 cards)",
      min: 40,
      max: 40,
      cardTypeContains: null,
      excludeCardTypeContains: ["Hero", "Weapon", "Equipment"],
    },
  ],
  combinedCounts: [
    {
      id: "pool-total",
      label: "Card Pool (Deck + Weapons + Equipment)",
      sections: ["weapon", "equipment", "main"],
      min: 0,
      max: 52,
    },
  ],
  copyLimit: {
    max: 1,
    appliesToSections: ["weapon", "equipment", "main"],
  },
  bannedCardNames: [
    // Refresh against fabtcgmeta.com/en/banned-restricted/.
    "Awakening",
    "Heartened Cross Strap",
    "Storm Striders",
  ],
  informationalRules: [
    "Only heroes with the \"Young\" subtype are legal — not automatically checked here.",
    "A card can only be included if its class/talent is a subset of your Hero's — not automatically checked here.",
  ],
};

export const FAB_FORMATS: DeckFormat[] = [FAB_CLASSIC_CONSTRUCTED, FAB_BLITZ];
