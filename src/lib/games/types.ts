import type { ProductType } from "@prisma/client";

export interface UnifiedSet {
  gameId: string;
  externalId: string;
  name: string;
  code: string;
  releaseDate?: Date;
  symbolUrl?: string;
  cardCount?: number;
}

export interface UnifiedCard {
  gameId: string;
  setExternalId: string;
  externalId: string;
  name: string;
  number?: string;
  rarity?: string;
  /** Illustrator credit, e.g. Pokémon's "Mitsuhiro Arita". */
  artist?: string;
  /** Game-specific card type, e.g. Riftbound's "Champion Unit" / "Legend" / "Gear", or Flesh & Blood's "Hero" / "Action" / "Equipment". */
  cardType?: string;
  imageSmallUrl?: string;
  imageLargeUrl?: string;
  productType: ProductType;
  language: string;
  /**
   * Which priced finish/printing this card is, e.g. pokemontcg.io's
   * "holofoil" / "reverseHolofoil" / "1stEditionHolofoil" — see
   * lib/games/pokemon/mapper.ts. Undefined for games with no finish concept
   * (every provider except Pokémon still returns one UnifiedCard per
   * externalId with this unset). When set, `variantLabel` is the generic
   * display name for that key (e.g. "Reverse Holo") — NOT any curated
   * collector-pattern override, which is resolved separately at read time
   * (see lib/games/pokemon/finish-patterns.ts) so it can be corrected
   * without a re-seed.
   */
  variantKey?: string;
  variantLabel?: string;
  /** Current price snapshot, if the provider returned one (may be absent). */
  price?: {
    raw?: number;
    foil?: number;
    currency: string;
    source: string;
  };
}

/**
 * One adapter per TCG. Only games with a free, no-key (or free-key) API that
 * returns real, ToS-safe pricing get a real implementation — see
 * `lib/games/registry.ts` for which games are WIRED vs COMING_SOON.
 */
export interface GameProvider {
  gameId: string;
  /** All sets for the game, most-recent first. */
  fetchSets(): Promise<UnifiedSet[]>;
  /** All cards in one set. */
  fetchCardsForSet(setExternalId: string): Promise<UnifiedCard[]>;
}
