import { db } from "@/lib/db";
import {
  getSportsCardProductById,
  isSportsCardsProConfigured,
  searchSportsCardProduct,
} from "@/lib/pricing/sportscardspro/client";
import { mapPriceChartingProduct, type GradedPriceValues } from "@/lib/pricing/pricecharting/mapper";
import { upsertSportsCardPriceSnapshot } from "@/lib/pricing/sports-snapshot";
import { todayDateString } from "@/lib/pricing/snapshot";

export type GradedPricesResult =
  | { available: false } // no SPORTSCARDSPRO_API_KEY/PRICECHARTING_API_KEY configured
  | { available: true; found: false } // configured, but no SportsCardsPro match for this card
  | { available: true; found: true; values: GradedPriceValues; capturedDate: string; cached: boolean };

/**
 * SportsCardItem analogue of getOrFetchGradedPrices() (lib/pricing/graded.ts)
 * — same on-demand-fetch-then-cache-for-the-day shape, backed by
 * SportsCardPriceSnapshot/upsertSportsCardPriceSnapshot (already built for
 * the background snapshot job, see run-sports-card-snapshot.ts) instead of
 * GradedPriceSnapshot.
 */
export async function getOrFetchSportsCardGradedPrices(
  sportsCardItemId: string
): Promise<GradedPricesResult> {
  const today = todayDateString();

  const existing = await db.sportsCardPriceSnapshot.findUnique({
    where: { sportsCardItemId_capturedDate: { sportsCardItemId, capturedDate: today } },
  });
  if (existing) {
    return { available: true, found: true, capturedDate: today, cached: true, values: fromRow(existing) };
  }

  if (!isSportsCardsProConfigured()) {
    return { available: false };
  }

  const item = await db.sportsCardItem.findUnique({ where: { id: sportsCardItemId } });
  if (!item) return { available: true, found: false };

  const product = item.priceChartingId
    ? await getSportsCardProductById(item.priceChartingId)
    : await searchSportsCardProduct(
        buildSearchQuery(item.playerName, item.year, item.setName, item.cardNumber)
      );

  if (!product?.id) {
    return { available: true, found: false };
  }

  if (!item.priceChartingId) {
    await db.sportsCardItem.update({ where: { id: item.id }, data: { priceChartingId: product.id } });
  }

  const values = mapPriceChartingProduct(product);
  await upsertSportsCardPriceSnapshot(db, sportsCardItemId, values, today);
  const row = await db.sportsCardPriceSnapshot.findUniqueOrThrow({
    where: { sportsCardItemId_capturedDate: { sportsCardItemId, capturedDate: today } },
  });

  return { available: true, found: true, capturedDate: today, cached: false, values: fromRow(row) };
}

function buildSearchQuery(
  playerName: string,
  year: number | null,
  setName: string,
  cardNumber: string | null
): string {
  return [year, setName, playerName, cardNumber ? `#${cardNumber}` : ""].filter(Boolean).join(" ");
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
