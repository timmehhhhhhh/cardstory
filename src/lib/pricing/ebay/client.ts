/**
 * Client for eBay's public "sold & completed listings" search results —
 * NOT an official eBay API. eBay's Browse API only returns active listings,
 * and the old Finding API's completed-items feature is deprecated/limited
 * to select partners, so there is no official way to get real sold comps.
 * This scrapes https://www.ebay.com/sch/i.html?...&LH_Sold=1&LH_Complete=1
 * instead — fragile (breaks on eBay layout changes) and against eBay's
 * terms of service, which is why it's gated behind an explicit opt-in env
 * var rather than being on by default. See ../pricecharting/client.ts for
 * the equivalent official-API client this deliberately does NOT try to
 * imitate the reliability of.
 */
import * as cheerio from "cheerio";

const BASE_URL = "https://www.ebay.com/sch/i.html";

/** Minimum gap between scrape requests, plus random jitter on top. */
const MIN_INTERVAL_MS = 3000;
const JITTER_MS = 1500;

let lastCallAt = 0;
async function throttle() {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now() + Math.floor(Math.random() * JITTER_MS);
}

export function isEbaySoldCompsEnabled(): boolean {
  return process.env.EBAY_SOLD_COMPS_ENABLED === "true";
}

export interface EbaySoldListing {
  title: string;
  price: number;
  currency: string;
  url: string;
  imageUrl: string | null;
  condition: string | null;
}

/**
 * Fetches and parses one page of eBay sold/completed listings for `query`.
 * Returns `null` (never throws) on network failure, a non-200 response, or
 * a page that looks blocked/CAPTCHA'd — callers treat that the same as
 * "no comps found" rather than surfacing an error.
 */
export async function fetchEbaySoldListings(query: string): Promise<EbaySoldListing[] | null> {
  if (!isEbaySoldCompsEnabled()) return null;

  await throttle();

  const url = new URL(BASE_URL);
  url.searchParams.set("_nkw", query);
  url.searchParams.set("LH_Sold", "1");
  url.searchParams.set("LH_Complete", "1");
  url.searchParams.set("_ipg", "60");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          process.env.EBAY_SCRAPE_USER_AGENT ??
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const html = await res.text();
  return parseSoldListingsHtml(html);
}

function parseSoldListingsHtml(html: string): EbaySoldListing[] | null {
  const $ = cheerio.load(html);

  // A CAPTCHA/interstitial page has none of the normal results markup —
  // treat "found nothing to parse" as "possibly blocked" and bail out to
  // `null` rather than confidently reporting zero comps.
  const items = $("li.s-item, li.s-card");
  if (items.length === 0) return null;

  const listings: EbaySoldListing[] = [];

  items.each((_, el) => {
    const node = $(el);
    const title = node.find(".s-item__title, .s-card__title").first().text().trim();
    // eBay always includes one boilerplate "Shop on eBay" placeholder card —
    // skip it rather than let it pollute the aggregate.
    if (!title || /^shop on ebay$/i.test(title)) return;

    const priceText = node.find(".s-item__price, .s-card__price").first().text().trim();
    const parsed = parsePrice(priceText);
    if (!parsed) return;

    const href = node.find("a.s-item__link, a.su-link, a[href*='/itm/']").first().attr("href") ?? "";
    const imageUrl = node.find("img").first().attr("src") ?? null;
    const condition = node.find(".s-item__subtitle, .s-card__subtitle").first().text().trim() || null;

    listings.push({
      title,
      price: parsed.amount,
      currency: parsed.currency,
      url: href,
      imageUrl,
      condition,
    });
  });

  return listings;
}

/** Parses eBay's price text, e.g. "$123.45", "US $1,234.00", "GBP 12.00". */
function parsePrice(text: string): { amount: number; currency: string } | null {
  const match = text.match(/([A-Z]{2,3}\s?\$|[$£€])?\s*([\d,]+\.\d{2}|[\d,]+)/);
  if (!match) return null;
  const amount = Number(match[2].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const symbol = match[1]?.trim() ?? "$";
  const currency = symbol.includes("£") ? "GBP" : symbol.includes("€") ? "EUR" : "USD";

  return { amount, currency };
}
