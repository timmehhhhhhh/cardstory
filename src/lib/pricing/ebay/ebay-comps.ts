import { db } from "@/lib/db";
import { getGameMeta } from "@/lib/games/registry";
import { fetchEbaySoldListings, isEbaySoldCompsEnabled } from "@/lib/pricing/ebay/client";
import { aggregateEbaySoldComps, type EbaySoldCompsAggregate } from "@/lib/pricing/ebay/mapper";
import { todayDateString } from "@/lib/pricing/snapshot";

export type EbaySoldCompsResult =
  | { available: false } // EBAY_SOLD_COMPS_ENABLED is not "true"
  | { available: true; found: false } // enabled, but no confident comps for this card
  | { available: true; found: true; values: EbaySoldCompsAggregate; capturedDate: string; cached: boolean };

/**
 * CatalogItem analogue of getOrFetchGradedPrices() (lib/pricing/graded.ts)
 * — same on-demand-fetch-then-cache-for-the-day shape, backed by
 * EbaySoldPriceSnapshot instead of GradedPriceSnapshot. Deliberately does
 * NOT touch CatalogItem.latestPriceRaw — see EbaySoldPriceSnapshot's schema
 * comment for why scraped comps stay a cross-reference, not the number
 * that drives pc valuation.
 */
export async function getOrFetchEbaySoldComps(catalogItemId: string): Promise<EbaySoldCompsResult> {
  const today = todayDateString();

  const existing = await db.ebaySoldPriceSnapshot.findUnique({
    where: { catalogItemId_capturedDate: { catalogItemId, capturedDate: today } },
  });
  if (existing) {
    return { available: true, found: existing.count > 0, capturedDate: today, cached: true, values: fromRow(existing) };
  }

  if (!isEbaySoldCompsEnabled()) {
    return { available: false };
  }

  const item = await db.catalogItem.findUnique({ where: { id: catalogItemId }, include: { set: true, game: true } });
  if (!item) return { available: true, found: false };

  const query = buildSearchQuery(item.name, item.number, item.gameId);
  const listings = await fetchEbaySoldListings(query);
  const values = aggregateEbaySoldComps(query, listings ?? []);

  const row = await db.ebaySoldPriceSnapshot.upsert({
    where: { catalogItemId_capturedDate: { catalogItemId, capturedDate: today } },
    create: { catalogItemId, capturedDate: today, ...toDbInput(values) },
    update: { ...toDbInput(values) },
  });

  return { available: true, found: row.count > 0, capturedDate: today, cached: false, values: fromRow(row) };
}

function buildSearchQuery(name: string, number: string | null, gameId: string): string {
  const gameLabel = getGameMeta(gameId)?.name ?? "";
  return [name, number ? `#${number}` : "", gameLabel].filter(Boolean).join(" ");
}

function toDbInput(v: EbaySoldCompsAggregate) {
  return {
    query: v.query,
    currency: v.currency,
    count: v.count,
    medianPrice: v.medianPrice,
    avgPrice: v.avgPrice,
    minPrice: v.minPrice,
    maxPrice: v.maxPrice,
  };
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
    // Cached rows don't retain the individual sample listings (only the
    // aggregate is persisted) — the "verify these yourself" link in the UI
    // falls back to a live eBay search instead of a stored sample.
    sampleListings: [],
  };
}
