/**
 * What defines a Curated Set (src/app/curated-sets) — a personal "chase
 * list" built from filters, compared against the user's live PC holdings to
 * show completion progress (see src/lib/curated-sets/progress.ts). A
 * superset of ViewFilters (src/lib/views/types.ts), the shape a Saved View
 * uses for its own filters:
 *
 * - `game`/`set` are pluralized to `games`/`sets` — a curated set can span
 *   multiple games at once (e.g. "every Steve Argyle card across FAB &
 *   MTG"), where a View targets one game or all of them.
 * - `variants` is new — a multi-select over CatalogItem.variantKey (a
 *   card's priced finish, e.g. Pokémon's "holofoil"/"1stEditionHolofoil" —
 *   see CatalogSearchParams.variant in src/lib/catalog/search.ts). Empty
 *   means every variant/finish counts, matching "every Variant that exists"
 *   in the collect-by-artist use case; a non-empty list opts into specific
 *   finishes only.
 * - No `sort` — a curated set is a chase definition, not a live search
 *   someone is actively re-sorting. `cardNames` is a structured stand-in for
 *   free-text `q`: unlike `q` (which also matches artist/number/set), it's
 *   scoped to just the card's own name, as multiple is/contains chips.
 */
export interface CuratedSetFilters {
  /** [] = every wired game (TCG + sports). */
  games: string[];
  /** [] = every set within the chosen games. */
  sets: string[];
  type: "all" | "CARD" | "SEALED";
  /** [] = all. Game-specific card type labels, e.g. Riftbound's "Champion Unit". */
  cardTypes: string[];
  /** [] = all. CatalogItem.rarity values, e.g. "Ultra Rare" or "Epic". */
  rarities: string[];
  /** [] = all. CatalogItem.domain values, e.g. Riftbound's "Fury"/"Calm" — no-op for every other game. */
  domains: string[];
  /** [] = all. CatalogItem.language — no-op for sports rows. */
  languages: ("EN" | "JP" | "CN" | "TW" | "KR")[];
  /** Free-text artist name chips, OR'd via case-insensitive "contains". No-op for sports rows (no artist column). */
  artists: string[];
  /**
   * Card-name chips, OR'd together. Each independently "is" (exact) or
   * "contains" (substring), case-insensitive, matched against
   * CatalogItem.name (SportsCardItem.playerName for sports rows). Always
   * also matches the English translation name (CatalogItem.nameEn) for a
   * non-English card — no-op there for sports rows, which have no
   * translation concept.
   */
  cardNames: { mode: "is" | "contains"; value: string }[];
  /** [] = every variant/finish. CatalogItem.variantKey values — see the doc comment above. */
  variants: string[];
  /** Sports cards only — show just each card's base version, collapsing every parallel/refractor into it. Defaults to on. */
  baseOnly: boolean;
}

export const DEFAULT_CURATED_SET_FILTERS: CuratedSetFilters = {
  games: [],
  sets: [],
  type: "all",
  cardTypes: [],
  rarities: [],
  domains: [],
  languages: [],
  artists: [],
  cardNames: [],
  variants: [],
  baseOnly: true,
};

export interface CuratedSet {
  id: string;
  name: string;
  filters: CuratedSetFilters;
  /** Copies of each matching card required to count it "complete" — 1 for a single-copy chase, >1 for a playset. */
  targetQuantity: number;
  createdAt: string;
  updatedAt: string;
}
