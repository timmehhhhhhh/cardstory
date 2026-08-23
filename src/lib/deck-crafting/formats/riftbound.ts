import type { DeckFormat } from "@/lib/deck-crafting/formats/types";

/**
 * Riftbound Constructed. Sources: riftbound.gg's deckbuilding guide
 * (https://riftbound.gg/deckbuilding-101-building-your-first-riftbound-deck/),
 * Danireon's sideboard-size writeup
 * (https://www.danireon.com/en-us/blogs/news/riftbound-sideboard-rules),
 * and Flexslot's tournament rule 403
 * (https://rules.flexslot.gg/rules/riftbound-tournament-rules-403-sideboard).
 *
 * cardType values come from lib/games/riftbound/card-types.ts's
 * cardTypeLabel(), e.g. "Legend", "Champion Unit", "Unit", "Signature
 * Spell", "Spell", "Gear", "Rune", "Battlefield" — clean and enum-like, so
 * substring matches here are exact-ish by construction.
 */
export const RIFTBOUND_CONSTRUCTED: DeckFormat = {
  id: "riftbound-constructed",
  gameId: "riftbound",
  label: "Constructed",
  description: "The standard 40-card Riftbound tournament format.",
  sections: [
    {
      id: "legend",
      label: "Legend",
      min: 1,
      max: 1,
      cardTypeContains: ["Legend"],
      excludeCardTypeContains: ["Unit"], // "Champion Unit" must not match Legend
    },
    {
      id: "champion",
      label: "Champion",
      min: 1,
      max: 1,
      cardTypeContains: ["Champion"],
    },
    {
      id: "battlefield",
      label: "Battlefields",
      min: 3,
      max: 3,
      cardTypeContains: ["Battlefield"],
    },
    {
      id: "rune",
      label: "Runes",
      min: 12,
      max: 12,
      cardTypeContains: ["Rune"],
    },
    {
      id: "main",
      label: "Main Deck",
      // 39, not 40: the chosen Champion lives in its own "champion" section
      // above but still counts as one of the deck's 40 cards, so this
      // section holds the other 39 — see validate.ts's MAIN_DECK_TOTAL,
      // which sums main + champion for the "40-card Main Deck" display/check.
      min: 39,
      max: 39,
      cardTypeContains: ["Unit", "Spell", "Gear"],
    },
    {
      id: "sideboard",
      label: "Sideboard",
      min: 0,
      max: 10,
      cardTypeContains: ["Unit", "Spell", "Gear"],
    },
    {
      id: "bench",
      label: "Bench",
      min: 0,
      max: null,
      cardTypeContains: ["Unit", "Spell", "Gear"],
    },
  ],
  combinedCounts: [
    {
      id: "main-total",
      label: "Main Deck (incl. Champion)",
      sections: ["main", "champion"],
      min: 40,
      max: 40,
    },
  ],
  copyLimit: {
    max: 3,
    // The 3-copy limit is pooled across Main Deck + sideboard, per Flexslot
    // rule 403. The chosen Champion's copy in "champion" plus any extra
    // copies placed in "main" both count toward this same limit — since a
    // deck only ever has 1 "champion" slot, pooling main+sideboard already
    // yields the correct "up to 2 additional copies" behavior without
    // needing to special-case the champion section separately.
    appliesToSections: ["main", "sideboard", "champion"],
  },
  bannedCardNames: [],
  informationalRules: [
    "Your Chosen Champion must be a Champion Unit whose champion tag matches your Legend, and you may only play cards from your Legend's two domains — not automatically checked here.",
    "Every Battlefield in your deck must have a unique name.",
  ],
};
