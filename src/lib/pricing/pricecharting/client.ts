/**
 * Thin client for PriceCharting's official Prices API
 * (https://www.pricecharting.com/api-documentation). Paid, documented API —
 * not scraping. Requires the user's own PRICECHARTING_API_KEY; every
 * exported function is a no-op returning `null` when it's unset, so the
 * feature disappears cleanly rather than erroring.
 *
 * Rate limit per PriceCharting's docs: 1 request/second, account
 * permissions revoked if exceeded. `throttle()` below enforces a floor of
 * ~1.1s between calls within this process. Note this only holds the line
 * within a single server instance — it is not a substitute for keeping real
 * call volume low, which the "on-demand + cache per day" design in
 * lib/pricing/graded.ts is what actually does that.
 */
const BASE_URL = "https://www.pricecharting.com";
const MIN_INTERVAL_MS = 1100;

let lastCallAt = 0;
async function throttle() {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

export function isPriceChartingConfigured(): boolean {
  return !!process.env.PRICECHARTING_API_KEY;
}

/** Raw shape of a /api/product response — prices are integer pennies. */
export interface PriceChartingProduct {
  status: "success" | "error";
  id?: string;
  "product-name"?: string;
  "console-name"?: string;
  genre?: string;
  "loose-price"?: number;
  "cib-price"?: number;
  "new-price"?: number;
  "graded-price"?: number;
  "box-only-price"?: number;
  "manual-only-price"?: number;
  "condition-17-price"?: number;
  "condition-18-price"?: number;
  "bgs-10-price"?: number;
  "error-message"?: string;
}

async function request(params: Record<string, string>): Promise<PriceChartingProduct | null> {
  const token = process.env.PRICECHARTING_API_KEY;
  if (!token) return null;

  await throttle();
  const url = new URL(`${BASE_URL}/api/product`);
  url.searchParams.set("t", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`PriceCharting request failed (${res.status})`);
  const json = (await res.json()) as PriceChartingProduct;
  if (json.status !== "success") return null;
  return json;
}

/** Full-text search — e.g. "charizard 4/102 pokemon", matches PriceCharting's own example queries. */
export async function searchPriceChartingProduct(query: string): Promise<PriceChartingProduct | null> {
  return request({ q: query });
}

/** Direct lookup once we've cached a product's PriceCharting id. */
export async function getPriceChartingProductById(id: string): Promise<PriceChartingProduct | null> {
  return request({ id });
}
