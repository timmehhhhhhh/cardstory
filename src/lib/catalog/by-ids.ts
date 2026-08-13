import { db } from "@/lib/db";

export interface CatalogItemDetail {
  id: string;
  gameId: string;
  externalId: string;
  name: string;
  number: string | null;
  rarity: string | null;
  imageSmallUrl: string | null;
  imageLargeUrl: string | null;
  setName: string;
  setId: string;
  productType: "CARD" | "SEALED";
  priceRaw: number | null;
  priceChangePct: number | null;
}

/** Batch lookup used to enrich local-only portfolio holdings (which only store catalogItemId). */
export async function getCatalogItemsByIds(ids: string[]): Promise<CatalogItemDetail[]> {
  if (ids.length === 0) return [];
  const rows = await db.catalogItem.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      gameId: true,
      externalId: true,
      name: true,
      number: true,
      rarity: true,
      imageSmallUrl: true,
      imageLargeUrl: true,
      productType: true,
      latestPriceRaw: true,
      priceChangePct: true,
      setId: true,
      set: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    gameId: r.gameId,
    externalId: r.externalId,
    name: r.name,
    number: r.number,
    rarity: r.rarity,
    imageSmallUrl: r.imageSmallUrl,
    imageLargeUrl: r.imageLargeUrl,
    setName: r.set.name,
    setId: r.setId,
    productType: r.productType,
    priceRaw: r.latestPriceRaw != null ? Number(r.latestPriceRaw) : null,
    priceChangePct: r.priceChangePct,
  }));
}
