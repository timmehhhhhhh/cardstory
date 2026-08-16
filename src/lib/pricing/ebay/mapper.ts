import type { EbaySoldListing } from "@/lib/pricing/ebay/client";

export interface EbaySoldCompsAggregate {
  query: string;
  count: number;
  currency: string;
  medianPrice: number | null;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  /** A handful of the actual listings behind the aggregate, for on-page audit/verification links. */
  sampleListings: EbaySoldListing[];
}

const SAMPLE_SIZE = 5;

/**
 * Aggregates raw scraped listings into a single comp figure. Scraped
 * titles inevitably include mismatched results (bundles/lots, wrong
 * variant, case-only/empty-box listings, typo'd searches eBay broadened),
 * so this restricts to USD-denominated listings and applies a basic IQR
 * outlier cut before computing stats — a plain average of raw scrape
 * results would be dragged around by a handful of $5 lots or $500
 * mis-tagged auctions. USD-only (rather than converting other currencies)
 * matches formatMoney()'s existing assumption that stored amounts are
 * already USD (see lib/utils/format.ts) — the same assumption
 * GradedPriceValues relies on for PriceCharting's USD-only API.
 */
export function aggregateEbaySoldComps(query: string, listings: EbaySoldListing[]): EbaySoldCompsAggregate {
  const empty: EbaySoldCompsAggregate = {
    query,
    count: 0,
    currency: "USD",
    medianPrice: null,
    avgPrice: null,
    minPrice: null,
    maxPrice: null,
    sampleListings: [],
  };
  if (listings.length === 0) return empty;

  const prices = listings
    .filter((l) => l.currency === "USD")
    .map((l) => l.price)
    .sort((a, b) => a - b);

  const filtered = filterOutliers(prices);
  if (filtered.length === 0) return empty;

  const sampleListings = listings.filter((l) => l.currency === "USD" && filtered.includes(l.price)).slice(0, SAMPLE_SIZE);

  return {
    query,
    count: filtered.length,
    currency: "USD",
    medianPrice: round2(median(filtered)),
    avgPrice: round2(filtered.reduce((sum, p) => sum + p, 0) / filtered.length),
    minPrice: round2(filtered[0]),
    maxPrice: round2(filtered[filtered.length - 1]),
    sampleListings,
  };
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Drops values outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR] from an already-sorted array. */
function filterOutliers(sorted: number[]): number[] {
  if (sorted.length < 4) return sorted; // too few points for a meaningful quartile cut
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;
  return sorted.filter((p) => p >= low && p <= high);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
