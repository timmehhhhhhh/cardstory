import type { SupportedCurrency } from "@/lib/constants";

/**
 * Deliberately NOT a widening of HoldingKind (src/lib/pc/types.ts). That
 * union is shared with WatchlistItem["kind"] and with WatchlistEntry.kind's
 * zod enum, and there is no such thing as a custom watchlist entry — adding
 * "custom" there would make it structurally legal at /api/watchlist too.
 * "custom" is a row the user keyed in by hand for a card that matches
 * nothing in either catalog.
 */
export type ShortlistItemKind = "tcg" | "sports" | "custom";

/**
 * A card spotted while physically shopping — a maybe-purchase, not
 * ownership. Lives in the In-Store Shortlist (src/app/shortlist) until the
 * user either deletes it (passed on it) or checks it out, which turns it
 * into a real Holding in a PC of their choosing.
 *
 * - `kind: "tcg"` — `catalogItemId` joins the TCG catalog ("<gameId>:<externalId>").
 * - `kind: "sports"` — `sportsCardItemId` joins a SportsCardItem.
 * - `kind: "custom"` — neither; `customName` carries its own display text,
 *   because there is no reference row to look a name up from.
 */
export interface ShortlistItem {
  id: string;
  kind: ShortlistItemKind;
  catalogItemId?: string;
  sportsCardItemId?: string;
  /** kind "custom" only — the name the user typed. Required in that branch. */
  customName?: string;
  /** kind "custom" only — optional free-text second line, e.g. "2020 Prizm · #5". */
  customSubtitle?: string;
  quantity: number;
  /**
   * The shop's asking price PER UNIT, in `askingCurrency` — NOT USD, and
   * NOT quantity-scaled. Two deliberate inversions of the conventions
   * elsewhere in the app:
   *
   * 1. Not USD. Every *market* price in this app is USD because it comes
   *    from one USD-denominated feed; an asking price is a sticker in a
   *    shop, denominated in whatever that shop uses. It also becomes
   *    Holding.costBasisTotal/costBasisCurrency verbatim at checkout, and
   *    FX_RATES_TO_USD (src/lib/constants.ts) is a static, manually
   *    refreshed table — normalising here would round-trip NZ$40 into
   *    NZ$39.87, and a later rate edit would retroactively change a price
   *    the user already paid.
   * 2. Per-unit, unlike Holding.costBasisTotal. A shortlist is built by
   *    pointing at one price tag; quantity is adjusted afterwards.
   *    Checkout multiplies the two back together.
   */
  askingPrice: number;
  askingCurrency: SupportedCurrency;
  notes?: string;
  /**
   * Where this row was added from — "Explore", "PC · {pcName}", "Business
   * Inventory" — set by whichever card-tile shortlist button created it.
   * Undefined for rows added the original way, straight from
   * ShortlistAddBar/CustomItemDialog on the Shortlist page itself.
   */
  source?: string;
  addedAt: string;
  updatedAt: string;
}

export type NewShortlistItemInput = Omit<ShortlistItem, "id" | "addedAt" | "updatedAt">;

/** Root shape persisted to localStorage under `cardstory:shortlist:v1`. */
export interface ShortlistStoreDataV1 {
  schemaVersion: 1;
  items: ShortlistItem[];
}
