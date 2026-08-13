/**
 * Client for PriceCharting's official Prices API
 * (https://www.pricecharting.com/api-documentation) — TCG cards. See
 * lib/pricing/pricecharting-family/shared-client.ts for the shared
 * request/throttle plumbing (also used by ../sportscardspro/client.ts).
 * Requires the user's own PRICECHARTING_API_KEY; every exported function
 * is a no-op returning `null` when it's unset, so the feature disappears
 * cleanly rather than erroring.
 */
import { requestProduct, type PriceChartingProduct } from "@/lib/pricing/pricecharting-family/shared-client";

const BASE_URL = "https://www.pricecharting.com";

export type { PriceChartingProduct };

export function isPriceChartingConfigured(): boolean {
  return !!process.env.PRICECHARTING_API_KEY;
}

async function request(params: Record<string, string>): Promise<PriceChartingProduct | null> {
  const token = process.env.PRICECHARTING_API_KEY;
  if (!token) return null;
  return requestProduct(BASE_URL, token, params);
}

/** Full-text search — e.g. "charizard 4/102 pokemon", matches PriceCharting's own example queries. */
export async function searchPriceChartingProduct(query: string): Promise<PriceChartingProduct | null> {
  return request({ q: query });
}

/** Direct lookup once we've cached a product's PriceCharting id. */
export async function getPriceChartingProductById(id: string): Promise<PriceChartingProduct | null> {
  return request({ id });
}
