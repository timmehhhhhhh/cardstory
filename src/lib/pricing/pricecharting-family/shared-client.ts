/**
 * Shared plumbing for PriceCharting and its sister site SportsCardsPro —
 * same API shape, same auth pattern (a `t` token param), same documented
 * 1 request/second rate limit. Both are official, documented, paid APIs
 * (not scraping). Since they're explicitly a "sister site" pair and may
 * share the same underlying account/rate-limit bucket, the throttle here
 * is a single module-level timestamp shared across BOTH domains rather
 * than one-per-domain, so we never accidentally do 2 req/sec combined
 * against what might be one shared limit.
 */
const MIN_INTERVAL_MS = 1100;

let lastCallAt = 0;
async function throttle() {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
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

export interface PriceChartingProductList {
  status: "success" | "error";
  products?: { id: string; "product-name"?: string; "console-name"?: string }[];
  "error-message"?: string;
}

export async function requestProduct(
  baseUrl: string,
  token: string,
  params: Record<string, string>
): Promise<PriceChartingProduct | null> {
  await throttle();
  const url = new URL(`${baseUrl}/api/product`);
  url.searchParams.set("t", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${baseUrl} request failed (${res.status})`);
  const json = (await res.json()) as PriceChartingProduct;
  if (json.status !== "success") return null;
  return json;
}

export async function requestProducts(
  baseUrl: string,
  token: string,
  params: Record<string, string>
): Promise<PriceChartingProductList["products"]> {
  await throttle();
  const url = new URL(`${baseUrl}/api/products`);
  url.searchParams.set("t", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${baseUrl} request failed (${res.status})`);
  const json = (await res.json()) as PriceChartingProductList;
  if (json.status !== "success") return [];
  return json.products ?? [];
}
