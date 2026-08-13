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
  imageSmallUrl?: string;
  imageLargeUrl?: string;
  productType: ProductType;
  language: string;
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
