import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { GAMES } from "@/lib/games/registry";

const WIRED_GAME_IDS = GAMES.filter((g) => g.status === "WIRED").map((g) => g.id);

export const CATALOG_SORTS = [
  "best_match",
  "name_asc",
  "price_desc",
  "price_asc",
  "trending_up",
  "trending_down",
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export interface CatalogSearchParams {
  q?: string;
  gameId?: string;
  setId?: string;
  productType?: "CARD" | "SEALED";
  /** Restrict results to these catalogItemIds (e.g. "owned" filter). */
  onlyIds?: string[];
  /** Exclude these catalogItemIds (e.g. "not owned" filter). */
  excludeIds?: string[];
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
}

export interface CatalogSearchItem {
  id: string;
  gameId: string;
  externalId: string;
  name: string;
  number: string | null;
  rarity: string | null;
  imageSmallUrl: string | null;
  setName: string;
  productType: "CARD" | "SEALED";
  priceRaw: number | null;
  priceChangePct: number | null;
  hasPrice: boolean;
}

function orderBy(sort: CatalogSort): Prisma.CatalogItemOrderByWithRelationInput[] {
  switch (sort) {
    case "price_desc":
      return [{ latestPriceRaw: { sort: "desc", nulls: "last" } }, { name: "asc" }];
    case "price_asc":
      return [{ latestPriceRaw: { sort: "asc", nulls: "last" } }, { name: "asc" }];
    case "trending_up":
      return [{ priceChangePct: { sort: "desc", nulls: "last" } }];
    case "trending_down":
      return [{ priceChangePct: { sort: "asc", nulls: "last" } }];
    case "name_asc":
      return [{ name: "asc" }];
    case "best_match":
    default:
      return [{ name: "asc" }];
  }
}

export async function searchCatalog(params: CatalogSearchParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 60) : 24;
  const sort = params.sort ?? "best_match";

  const where: Prisma.CatalogItemWhereInput = {
    gameId: params.gameId ? params.gameId : { in: WIRED_GAME_IDS },
    setId: params.setId,
    productType: params.productType,
    name: params.q ? { contains: params.q, mode: "insensitive" } : undefined,
    id: params.onlyIds
      ? { in: params.onlyIds }
      : params.excludeIds
        ? { notIn: params.excludeIds }
        : undefined,
  };

  const [rows, total] = await Promise.all([
    db.catalogItem.findMany({
      where,
      orderBy: orderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        gameId: true,
        externalId: true,
        name: true,
        number: true,
        rarity: true,
        imageSmallUrl: true,
        productType: true,
        latestPriceRaw: true,
        priceChangePct: true,
        latestPriceDate: true,
        set: { select: { name: true } },
      },
    }),
    db.catalogItem.count({ where }),
  ]);

  const items: CatalogSearchItem[] = rows.map((r) => ({
    id: r.id,
    gameId: r.gameId,
    externalId: r.externalId,
    name: r.name,
    number: r.number,
    rarity: r.rarity,
    imageSmallUrl: r.imageSmallUrl,
    setName: r.set.name,
    productType: r.productType,
    priceRaw: r.latestPriceRaw != null ? Number(r.latestPriceRaw) : null,
    priceChangePct: r.priceChangePct,
    hasPrice: r.latestPriceDate != null,
  }));

  return { items, total, page, pageSize };
}
