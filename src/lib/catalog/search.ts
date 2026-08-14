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
  "type_asc",
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export interface CatalogSearchParams {
  q?: string;
  gameId?: string;
  setId?: string;
  productType?: "CARD" | "SEALED";
  /** Game-specific card type, e.g. Riftbound's "Champion Unit" — see CatalogItem.cardType. */
  cardType?: string;
  /** CatalogItem.rarity, e.g. Pokémon's "Ultra Rare" or Riftbound's "Epic". */
  rarity?: string;
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
  cardType: string | null;
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
    case "type_asc":
      return [{ cardType: { sort: "asc", nulls: "last" } }, { name: "asc" }];
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
    cardType: params.cardType,
    rarity: params.rarity,
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
        cardType: true,
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
    cardType: r.cardType,
    imageSmallUrl: r.imageSmallUrl,
    setName: r.set.name,
    productType: r.productType,
    priceRaw: r.latestPriceRaw != null ? Number(r.latestPriceRaw) : null,
    priceChangePct: r.priceChangePct,
    hasPrice: r.latestPriceDate != null,
  }));

  return { items, total, page, pageSize };
}

/**
 * Every distinct non-null CatalogItem.cardType in the catalog, for
 * populating Explore's "Card Type" filter — read from real data rather than
 * a hardcoded list so it stays accurate as new sets/supertypes get seeded
 * (currently only Riftbound populates this column; see
 * lib/games/riftbound/card-types.ts).
 */
export async function getDistinctCardTypes(): Promise<string[]> {
  const rows = await db.catalogItem.findMany({
    where: { cardType: { not: null } },
    distinct: ["cardType"],
    select: { cardType: true },
    orderBy: { cardType: "asc" },
  });
  return rows.map((r) => r.cardType as string);
}

/**
 * Every distinct non-empty CatalogItem.rarity in the catalog, for populating
 * Explore's "Rarity" filter — optionally scoped to a single game, since
 * rarity taxonomies don't overlap between games (Pokémon's "Rare Holo GX" vs
 * Riftbound's "Epic"). Some rows have rarity = "" (not null) from
 * pokemontcg.io promo/sealed entries, so both null and "" are excluded.
 */
export async function getDistinctRarities(gameId?: string): Promise<string[]> {
  const rows = await db.catalogItem.findMany({
    where: { gameId, NOT: [{ rarity: null }, { rarity: "" }] },
    distinct: ["rarity"],
    select: { rarity: true },
    orderBy: { rarity: "asc" },
  });
  return rows.map((r) => r.rarity as string);
}
