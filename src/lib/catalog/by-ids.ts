import { db } from "@/lib/db";
import { defaultFinishLabel } from "@/lib/games/pokemon/mapper";
import { getFinishDisplayLabel } from "@/lib/games/pokemon/finish-patterns";

export interface CatalogItemDetail {
  id: string;
  gameId: string;
  externalId: string;
  name: string;
  /** English translation of `name`, when known — see CatalogItem.nameEn. Null for English/untranslated cards. */
  nameEn: string | null;
  number: string | null;
  rarity: string | null;
  /** Game-specific card type, e.g. Riftbound's "Champion Unit" — see CatalogItem.cardType. Used by Deck Crafting to slot a card into a format's sections (src/lib/deck-crafting/validate.ts). Null for games/cards without a captured type. */
  cardType: string | null;
  /** CatalogItem.artist — null for games/cards without a captured artist credit. */
  artist: string | null;
  /** CatalogItem.language — always "EN" for non-Pokémon games (see CatalogItem.language's column comment). */
  language: string;
  /** CatalogItem.domain — Riftbound only; empty for every other game. */
  domain: string[];
  /** "" (CatalogItem.variantKey's storage default) normalized to null — see tcgItemToSearchItem's matching normalization in search.ts. */
  variantKey: string | null;
  /** Resolved display label for variantKey (curated collector-pattern name when one exists, else the generic finish name) — same computation as CatalogSearchItem.variantLabel in search.ts. Null whenever variantKey is null. */
  variantLabel: string | null;
  imageSmallUrl: string | null;
  imageLargeUrl: string | null;
  setName: string;
  /** English translation of setName, when known — see Set.nameEn. Null for English/untranslated sets. */
  setNameEn: string | null;
  /** Set.code — the provider's own set id (e.g. "me2"), not a fan/community abbreviation. See deriveSetInitials in lib/utils/name-match.ts for how a short-form query like "MEP 014" still resolves against a set without a stored short code. */
  setCode: string;
  setId: string;
  /** CatalogItem.nationalPokedexNumbers — empty for non-Pokémon-species cards (sealed products, other games). */
  nationalPokedexNumbers: number[];
  productType: "CARD" | "SEALED";
  priceRaw: number | null;
  priceChangePct: number | null;
  /** Set.releaseDate, as an ISO date string ("YYYY-MM-DD"). Null when no confidently-sourced date was captured for this set. */
  releaseDate: string | null;
}

/**
 * Batch lookup used to enrich local-only pc holdings/watchlist entries
 * (which only store catalogItemId) with full display/filter/sort fields —
 * kept in parity with CatalogSearchItem (src/lib/catalog/search.ts) so PC,
 * Watchlist, and Explore can all filter/sort/group on the same fields (see
 * Watchlist's filter/sort/group toolbar in src/lib/watchlist/selectors.ts).
 */
export async function getCatalogItemsByIds(ids: string[]): Promise<CatalogItemDetail[]> {
  if (ids.length === 0) return [];
  const rows = await db.catalogItem.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      gameId: true,
      externalId: true,
      name: true,
      nameEn: true,
      number: true,
      rarity: true,
      cardType: true,
      artist: true,
      language: true,
      domain: true,
      variantKey: true,
      imageSmallUrl: true,
      imageLargeUrl: true,
      productType: true,
      latestPriceRaw: true,
      priceChangePct: true,
      setId: true,
      nationalPokedexNumbers: true,
      // `code` is what the curated finish-pattern overlay keys off of (see
      // getFinishDisplayLabel below) — not Set.id. `nameEn` and `code` are
      // also surfaced on CatalogItemDetail for the local (non-DB-backed)
      // search filters — see matchesNameNumberQuery in lib/utils/name-match.ts.
      set: { select: { name: true, nameEn: true, releaseDate: true, code: true } },
    },
  });

  return rows.map((r) => {
    // "" (the storage default for every non-Pokémon row) means "no finish
    // concept" — normalize to null the same way tcgItemToSearchItem does.
    const variantKey = r.variantKey || null;
    const variantLabel = variantKey
      ? getFinishDisplayLabel(r.set.code, variantKey, defaultFinishLabel(variantKey))
      : null;
    return {
      id: r.id,
      gameId: r.gameId,
      externalId: r.externalId,
      name: r.name,
      nameEn: r.nameEn,
      number: r.number,
      rarity: r.rarity,
      cardType: r.cardType,
      artist: r.artist,
      language: r.language,
      domain: r.domain,
      variantKey,
      variantLabel,
      imageSmallUrl: r.imageSmallUrl,
      imageLargeUrl: r.imageLargeUrl,
      setName: r.set.name,
      setNameEn: r.set.nameEn,
      setCode: r.set.code,
      setId: r.setId,
      nationalPokedexNumbers: r.nationalPokedexNumbers,
      productType: r.productType,
      priceRaw: r.latestPriceRaw != null ? Number(r.latestPriceRaw) : null,
      priceChangePct: r.priceChangePct,
      releaseDate: r.set.releaseDate ? r.set.releaseDate.toISOString().slice(0, 10) : null,
    };
  });
}
