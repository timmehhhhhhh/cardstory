/** Shared shapes for scripts/data/pokemon-manual/*.ts — see scripts/seed-pokemon-manual.ts. */

export interface ManualSetRef {
  /** Must match a Set.id already produced by mapTcgdexSet/seed-catalog.ts, e.g. "pokemon:ja:L1a". */
  setId: string;
  gameId: string;
  /** Set.code, e.g. "ja:L1a" — same "<lang>:<tcgdexId>" scheme tcgdex-client.ts uses. */
  code: string;
  name: string;
  releaseDate?: string; // "YYYY-MM-DD"
  symbolUrl?: string;
  cardCount?: number;
}

export interface ManualCatalogItemEntry {
  set: ManualSetRef;
  /** tcgdex-style "<lang>:<id>", e.g. "ja:L1a-071" — if tcgdex ever adds this exact
   *  card itself, the row converges onto the same id instead of duplicating. */
  externalId: string;
  name: string;
  number?: string;
  rarity?: string;
  artist?: string;
  cardType?: string;
  /** Left undefined when no legitimate image source exists — never scrape one in. */
  imageSmallUrl?: string;
  imageLargeUrl?: string;
  productType?: "CARD" | "SEALED";
  /** ItemLanguage code, e.g. "JP" — see lib/pc/types.ts. */
  language: string;
  /** Provenance / verification trail — required so every row's sourcing is auditable. */
  sourceNote: string;
  /** false = stub. The seed script skips and warns on any unverified row rather than
   *  seeding a guessed card number. Only flip to true once confirmed against a primary
   *  or multiple independently-corroborating sources. */
  verified: boolean;
}
