import { db } from "@/lib/db";
import { getGameMeta } from "@/lib/games/registry";
import {
  getPriceChartingProductById,
  isPriceChartingConfigured,
  searchPriceChartingProduct,
} from "@/lib/pricing/pricecharting/client";
import { mapPriceChartingProduct, type GradedPriceValues } from "@/lib/pricing/pricecharting/mapper";
import { todayDateString } from "@/lib/pricing/snapshot";

export type GradedPricesResult =
  | { available: false } // no PRICECHARTING_API_KEY configured
  | { available: true; found: false } // configured, but no PriceCharting match for this card
  | { available: true; found: true; values: GradedPriceValues; capturedDate: string; cached: boolean };

/**
 * Returns today's graded prices for a catalog item, fetching from
 * PriceCharting on first request each day and serving the cached
 * GradedPriceSnapshot row on every request after that (see
 * prisma/schema.prisma for why this is on-demand rather than a bulk job).
 */
export async function getOrFetchGradedPrices(catalogItemId: string): Promise<GradedPricesResult> {
  const today = todayDateString();

  const existing = await db.gradedPriceSnapshot.findUnique({
    where: { catalogItemId_capturedDate: { catalogItemId, capturedDate: today } },
  });
  if (existing) {
    return { available: true, found: true, capturedDate: today, cached: true, values: fromRow(existing) };
  }

  if (!isPriceChartingConfigured()) {
    return { available: false };
  }

  const item = await db.catalogItem.findUnique({
    where: { id: catalogItemId },
    include: { set: true },
  });
  if (!item) return { available: true, found: false };

  const product = item.priceChartingId
    ? await getPriceChartingProductById(item.priceChartingId)
    : await searchPriceChartingProduct(buildSearchQuery(item.name, item.number, item.gameId));

  if (!product?.id) {
    return { available: true, found: false };
  }

  if (!item.priceChartingId) {
    await db.catalogItem.update({ where: { id: item.id }, data: { priceChartingId: product.id } });
  }

  const values = mapPriceChartingProduct(product);
  const row = await db.gradedPriceSnapshot.upsert({
    where: { catalogItemId_capturedDate: { catalogItemId, capturedDate: today } },
    create: { catalogItemId, capturedDate: today, ...toDecimalInput(values) },
    update: { ...toDecimalInput(values) },
  });

  return { available: true, found: true, capturedDate: today, cached: false, values: fromRow(row) };
}

function buildSearchQuery(name: string, number: string | null, gameId: string): string {
  const gameLabel = getGameMeta(gameId)?.name ?? "";
  return [name, number ? `#${number}` : "", gameLabel].filter(Boolean).join(" ");
}

function toDecimalInput(v: GradedPriceValues) {
  return {
    loosePrice: v.loosePrice,
    grade7Price: v.grade7Price,
    grade8Price: v.grade8Price,
    grade9Price: v.grade9Price,
    grade95Price: v.grade95Price,
    psa10Price: v.psa10Price,
    cgc10Price: v.cgc10Price,
    sgc10Price: v.sgc10Price,
    bgs10Price: v.bgs10Price,
  };
}

function fromRow(row: {
  loosePrice: unknown;
  grade7Price: unknown;
  grade8Price: unknown;
  grade9Price: unknown;
  grade95Price: unknown;
  psa10Price: unknown;
  cgc10Price: unknown;
  sgc10Price: unknown;
  bgs10Price: unknown;
}): GradedPriceValues {
  const n = (v: unknown) => (v == null ? null : Number(v));
  return {
    loosePrice: n(row.loosePrice),
    grade7Price: n(row.grade7Price),
    grade8Price: n(row.grade8Price),
    grade9Price: n(row.grade9Price),
    grade95Price: n(row.grade95Price),
    psa10Price: n(row.psa10Price),
    cgc10Price: n(row.cgc10Price),
    sgc10Price: n(row.sgc10Price),
    bgs10Price: n(row.bgs10Price),
  };
}
