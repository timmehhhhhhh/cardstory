/**
 * Deck Crafting's format-rule types. A `DeckFormat` is a pure data
 * description of one game's construction rules for one tournament format
 * (e.g. Riftbound Constructed, FAB Blitz, Pokémon Standard) — deliberately
 * data, not per-game branching logic, so src/lib/deck-crafting/validate.ts
 * can evaluate any deck the same way by reading its format's config. Mirrors
 * how src/lib/games/registry.ts's GAMES array is the single source of truth
 * for which games exist, rather than scattering game checks through code.
 */

/** A section a deck is built out of, e.g. Riftbound's "Legend" or FAB's "Hero". */
export interface DeckSection {
  id: string;
  label: string;
  /** Minimum copies required in this section for the deck to be "complete". */
  min: number;
  /** Maximum copies allowed, or null for no cap (e.g. Riftbound's Bench). */
  max: number | null;
  /**
   * How a CatalogItem is recognized as eligible for this section. Matched
   * against CatalogItem.cardType, which is a clean enum-like string for
   * Riftbound ("Champion Unit" | "Legend" | "Rune" | "Battlefield" | ...)
   * and Pokémon (once backfilled — see mapper.ts), but free text for FAB
   * (goagain's type_text) — a substring test is deliberately used for all
   * three rather than an exact-match, since it's tolerant of FAB's messier
   * strings (e.g. "Action - Attack") without needing a second matcher shape.
   * `null` means "no automatic type check" — used for a catch-all section
   * like FAB's / Pokémon's single main pool where every non-special card is
   * eligible, so exclusion is left to explicit `excludeCardTypeContains`.
   */
  cardTypeContains: string[] | null;
  /** Card types that are never eligible here even if cardTypeContains matched (e.g. exclude "Basic" energy from a Trainer-only section). */
  excludeCardTypeContains?: string[];
}

export interface CopyLimitRule {
  /** Max copies of any single card name allowed. */
  max: number;
  /** Which section ids this limit is pooled across (e.g. Riftbound counts Main Deck + sideboard together). */
  appliesToSections: string[];
  /**
   * Card types exempt from the limit entirely (e.g. Pokémon's Basic
   * Energy). Matched the same substring way as DeckSection.cardTypeContains.
   */
  exemptCardTypeContains?: string[];
}

/**
 * A read-only rollup shown alongside the real sections — e.g. Riftbound's
 * "40-card Main Deck" is actually the "main" section (39) plus the single
 * required "champion" section (1) combined; rather than special-casing that
 * in validate.ts, any format can declare a named sum-of-sections check here.
 */
export interface CombinedCountRule {
  id: string;
  label: string;
  sections: string[];
  min: number;
  max: number | null;
}

export interface DeckFormat {
  id: string;
  gameId: string;
  label: string;
  /** One-line description shown in the format picker. */
  description: string;
  sections: DeckSection[];
  combinedCounts?: CombinedCountRule[];
  copyLimit: CopyLimitRule;
  /**
   * Hand-maintained list of currently-banned card names for this format —
   * no free machine-readable banlist API exists for any of these three
   * games, so this needs periodic manual refresh against each publisher's
   * own banlist page, same maintenance shape as src/lib/games/registry.ts's
   * GAMES/GAME_PROVIDERS. Matched case-insensitively against CatalogItem.name.
   */
  bannedCardNames: string[];
  /**
   * Rules that matter for real play but can't be structurally checked from
   * today's catalog fields (no domain/talent/legality columns exist) — shown
   * to the user as informational text, never enforced as a hard block.
   */
  informationalRules: string[];
}
