import { db } from "@/lib/db";
import { fetchEbaySoldListings, isEbaySoldCompsEnabled } from "@/lib/pricing/ebay/client";
import { aggregateEbaySoldComps, type EbaySoldCompsAggregate } from "@/lib/pricing/ebay/mapper";
import { todayDateString } from "@/lib/pricing/snapshot";
import type { EbaySoldCompsResult } from "@/lib/pricing/ebay/ebay-comps";

/**
 * SportsCardItem analogue of getOrFetchEbaySoldComps() — same shape,
 * backed by SportsCardEbaySoldPriceSnapshot. Mirrors the existing
 * graded.ts/sports-graded.ts duplication rather than sharing one generic
 * function, matching the rest of this pricing lib's convention.
 */
export async function getOrFetchSportsCardEbaySoldComps(sportsCardItemId: string): Promise<EbaySoldCompsResult> {
  const today = todayDateString();

  const existing = await db.sportsCardEbaySoldPriceSnapshot.findUnique({
    where: { sportsCardItemId_capturedDate: { sportsCardItemId, capturedDate: today } },
  });
  if (existing) {
    return { available: true, found: existing.count > 0, capturedDate: today, cached: true, values: fromRow(existing) };
  }

  if (!isEbaySoldCompsEnabled()) {
    return { available: false };
  }

  const item = await db.sportsCardItem.findUnique({ where: { id: sportsCardItemId } });
  if (!item) return { available: true, found: false };

  const query = buildSearchQuery(item.playerName, item.year, item.setName, item.cardNumber, item.parallelName);
  const listings = await fetchEbaySoldListings(query);
  const values = aggregateEbaySoldComps(query, listings ?? []);

  const row = await db.sportsCardEbaySoldPriceSnapshot.upsert({
    where: { sportsCardItemId_capturedDate: { sportsCardItemId, capturedDate: today } },
    create: {
      sportsCardItemId,
      capturedDate: today,
      query: values.query,
      currency: values.currency,
      count: values.count,
      medianPrice: values.medianPrice,
      avgPrice: values.avgPrice,
      minPrice: values.minPrice,
      maxPrice: values.maxPrice,
    },
    update: {
      query: values.query,
      currency: values.currency,
      count: values.count,
      medianPrice: values.medianPrice,
      avgPrice: values.avgPrice,
      minPrice: values.minPrice,
      maxPrice: values.maxPrice,
    },
  });

  return { available: true, found: row.count > 0, capturedDate: today, cached: false, values: fromRow(row) };
}

function buildSearchQuery(
  playerName: string,
  year: number | null,
  setName: string,
  cardNumber: string | null,
  parallelName: string | null
): string {
  return [year, setName, playerName, cardNumber ? `#${cardNumber}` : "", parallelName]
    .filter(Boolean)
    .join(" ");
}

function fromRow(row: {
  query: string;
  currency: string;
  count: number;
  medianPrice: unknown;
  avgPrice: unknown;
  minPrice: unknown;
  maxPrice: unknown;
}): EbaySoldCompsAggregate {
  const n = (v: unknown) => (v == null ? null : Number(v));
  return {
    query: row.query,
    count: row.count,
    currency: row.currency,
    medianPrice: n(row.medianPrice),
    avgPrice: n(row.avgPrice),
    minPrice: n(row.minPrice),
    maxPrice: n(row.maxPrice),
    // Cached rows don't retain individual sample listings — same tradeoff
    // as ebay-comps.ts's fromRow().
    sampleListings: [],
  };
}
