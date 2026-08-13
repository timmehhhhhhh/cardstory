/**
 * Client for SportsCardsPro's official Prices API
 * (https://www.sportscardspro.com/api-documentation) — PriceCharting's
 * sister site for sports cards, same API shape/auth/rate-limit family. See
 * lib/pricing/pricecharting-family/shared-client.ts for the shared
 * request/throttle plumbing (shared with ../pricecharting/client.ts so we
 * never exceed 1 req/sec combined across both domains).
 *
 * Auth: tries SPORTSCARDSPRO_API_KEY first, then falls back to
 * PRICECHARTING_API_KEY — the two products are billed separately per
 * SportsCardsPro's docs, but a shared/bundled subscription isn't ruled
 * out, so checking both env vars costs nothing and helps either way.
 */
import {
  requestProduct,
  requestProducts,
  type PriceChartingProduct,
  type PriceChartingProductList,
} from "@/lib/pricing/pricecharting-family/shared-client";

const BASE_URL = "https://www.sportscardspro.com";

export type { PriceChartingProduct };
export type SportsCardCandidate = NonNullable<PriceChartingProductList["products"]>[number];

function token(): string | undefined {
  return process.env.SPORTSCARDSPRO_API_KEY || process.env.PRICECHARTING_API_KEY;
}

export function isSportsCardsProConfigured(): boolean {
  return !!token();
}

/** Full-text search returning the single best match — e.g. "michael jordan 1986 fleer #57". */
export async function searchSportsCardProduct(query: string): Promise<PriceChartingProduct | null> {
  const t = token();
  if (!t) return null;
  return requestProduct(BASE_URL, t, { q: query });
}

/** Full-text search returning up to 20 candidates — lets a user pick the exact parallel. */
export async function searchSportsCardCandidates(query: string): Promise<SportsCardCandidate[]> {
  const t = token();
  if (!t) return [];
  return requestProducts(BASE_URL, t, { q: query }) as Promise<SportsCardCandidate[]>;
}

/** Direct lookup once we've cached a product's SportsCardsPro id. */
export async function getSportsCardProductById(id: string): Promise<PriceChartingProduct | null> {
  const t = token();
  if (!t) return null;
  return requestProduct(BASE_URL, t, { id });
}
