import { db } from "@/lib/db";

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
  imageSmallUrl: string | null;
  imageLargeUrl: string | null;
  setName: string;
  setId: string;
  productType: "CARD" | "SEALED";
  priceRaw: number | null;
  priceChangePct: number | null;
  /** Set.releaseDate, as an ISO date string ("YYYY-MM-DD"). Null when no confidently-sourced date was captured for this set. */
  releaseDate: string | null;
}

/** Batch lookup used to enrich local-only pc holdings (which only store catalogItemId). */
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
      imageSmallUrl: true,
      imageLargeUrl: true,
      productType: true,
      latestPriceRaw: true,
      priceChangePct: true,
      setId: true,
      set: { select: { name: true, releaseDate: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    gameId: r.gameId,
    externalId: r.externalId,
    name: r.name,
    nameEn: r.nameEn,
    number: r.number,
    rarity: r.rarity,
    cardType: r.cardType,
    imageSmallUrl: r.imageSmallUrl,
    imageLargeUrl: r.imageLargeUrl,
    setName: r.set.name,
    setId: r.setId,
    productType: r.productType,
    priceRaw: r.latestPriceRaw != null ? Number(r.latestPriceRaw) : null,
    priceChangePct: r.priceChangePct,
    releaseDate: r.set.releaseDate ? r.set.releaseDate.toISOString().slice(0, 10) : null,
  }));
}
