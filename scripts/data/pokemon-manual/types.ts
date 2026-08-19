/** Shared shapes for scripts/data/pokemon-manual/*.ts — see scripts/seed-pokemon-manual.ts. */

export interface ManualSetRef {
  /** Must match a Set.id already produced by mapTcgdexSet/seed-catalog.ts, e.g. "pokemon:ja:L1a". */
  setId: string;
  gameId: string;
  /** Set.code, e.g. "ja:L1a" — same "<lang>:<tcgdexId>" scheme tcgdex-client.ts uses. */
  code: string;
  name: string;
  /** English translation of `name`, when known — see Set.nameEn and scripts/data/pokemon-set-translations.ts. */
  nameEn?: string;
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
  /** English name of this printing, when known — see CatalogItem.nameEn. */
  nameEn?: string;
  number?: string;
  rarity?: string;
  artist?: string;
  cardType?: string;
  /**
   * Left undefined for hand-curated rows whose image isn't available.
   *
   * Bulk image sourcing does NOT happen here — non-English Pokémon scans are
   * backfilled separately from the official publisher sites into
   * scripts/data/card-images/ (see scripts/crawl-pokemon-ja-images.ts). Those
   * are stored as hotlinks to the publisher's own CDN and never re-hosted.
   * Retail/marketplace listing photos remain off-limits as a source: they're
   * a seller's photo of one copy, not a reference scan of the printing.
   */
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
