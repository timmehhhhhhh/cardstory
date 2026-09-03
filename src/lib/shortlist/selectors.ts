import { DEFAULT_CONDITION_PRICING, type SupportedCurrency } from "@/lib/constants";
import { convertFromUsd } from "@/lib/utils/format";
import { conditionAdjustedPrice } from "@/lib/condition-pricing/resolve";
import type { ConditionPricing } from "@/lib/condition-pricing/types";
import { buildDisplay, type DisplayInfo } from "@/lib/pc/selectors";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";
import type { SportsCardItemDetail } from "@/lib/sportscards/manage";
import type { ShortlistItem } from "@/lib/shortlist/types";

/**
 * Shortlist rows enriched with live catalog data.
 *
 * Deliberately not enrichHoldings(): that needs a full Holding (condition,
 * language, acquiredAt, costBasisTotal) and computes gain/loss against a
 * cost basis a shortlist item doesn't have. It does reuse buildDisplay,
 * which is where all the TCG-vs-sports naming, image-precedence and
 * parallel-watermark rules live.
 */
export interface EnrichedShortlistItem extends ShortlistItem {
  catalogItem: CatalogItemDetail | undefined;
  sportsCardItem: SportsCardItemDetail | undefined;
  display: DisplayInfo;
  /** Live market unit price in USD. Null for a custom item, or an untracked/unpriced card. */
  marketUnitPrice: number | null;
  /** askingPrice * quantity, in askingCurrency — the number the user is about to pay. */
  askingTotal: number;
  /**
   * The market price converted into askingCurrency, purely so a row can show
   * "is this a fair price?" at a glance. The one place in this feature FX is
   * acceptable: it's an advisory comparison, not money changing hands, and
   * FX_RATES_TO_USD is a static table — label it as approximate wherever
   * it's rendered.
   */
  marketUnitPriceInAskingCurrency: number | null;
  /**
   * What this copy is worth given the condition the user set, in
   * askingCurrency — marketUnitPriceInAskingCurrency scaled by the owner's
   * percentage for that condition (src/lib/condition-pricing). Null when
   * there is no market price (a custom row) or no condition set yet, since
   * in both cases there is no honest number to show.
   *
   * Inherits marketUnitPriceInAskingCurrency's FX caveat above and adds
   * one of its own: the percentages are the user's own rule of thumb, not
   * a quote from anywhere. Advisory only — label it approximate wherever
   * it's rendered, and never sum it into a checkout total.
   */
  conditionUnitValue: number | null;
}

/** Custom items have no catalog row to build a display from, so they carry their own. */
function customDisplay(item: ShortlistItem): DisplayInfo {
  return {
    name: item.customName ?? "Untitled item",
    nameEn: null,
    subtitle: item.customSubtitle ?? "Custom item",
    number: null,
    setName: null,
    setNameEn: null,
    setCode: null,
    nationalPokedexNumbers: [],
    imageUrl: null,
    imageWatermark: null,
    href: null,
    groupKey: "custom",
    groupLabel: "Custom",
    priceChangePct: null,
  };
}

export function enrichShortlist(
  items: ShortlistItem[],
  catalogItems: CatalogItemDetail[],
  sportsCardItems: SportsCardItemDetail[] = [],
  // Defaulted so callers that don't care about condition pricing (and
  // tests) stay one-liners — useShortlistData passes the signed-in user's
  // own map.
  pricing: ConditionPricing = DEFAULT_CONDITION_PRICING
): EnrichedShortlistItem[] {
  const catalogById = new Map(catalogItems.map((c) => [c.id, c]));
  const sportsById = new Map(sportsCardItems.map((c) => [c.id, c]));

  return items.map((item) => {
    const catalogItem = item.kind === "tcg" && item.catalogItemId ? catalogById.get(item.catalogItemId) : undefined;
    const sportsCardItem =
      item.kind === "sports" && item.sportsCardItemId ? sportsById.get(item.sportsCardItemId) : undefined;

    const marketUnitPrice =
      item.kind === "custom"
        ? null
        : ((item.kind === "sports" ? sportsCardItem?.priceRaw : catalogItem?.priceRaw) ?? null);

    const marketUnitPriceInAskingCurrency =
      marketUnitPrice != null ? convertFromUsd(marketUnitPrice, item.askingCurrency) : null;

    return {
      ...item,
      catalogItem,
      sportsCardItem,
      display:
        item.kind === "custom"
          ? customDisplay(item)
          : buildDisplay(
              { kind: item.kind, sportsCardItemId: item.sportsCardItemId },
              catalogItem,
              sportsCardItem
            ),
      marketUnitPrice,
      askingTotal: item.askingPrice * item.quantity,
      marketUnitPriceInAskingCurrency,
      conditionUnitValue: conditionAdjustedPrice(
        marketUnitPriceInAskingCurrency,
        item.rawCondition,
        pricing
      ),
    };
  });
}

export interface ShortlistCurrencyTotal {
  currency: SupportedCurrency;
  total: number;
  itemCount: number;
}

export interface ShortlistTotals {
  /**
   * Grouped by currency rather than summed into one number. A shortlist can
   * legitimately mix currencies (a trip abroad, an online order alongside a
   * local shop), and the totals here are what someone is about to hand over
   * at a counter — fake-converting them through a static FX table would put
   * a wrong number in front of a real transaction. Sorted by descending
   * total so the dominant currency reads first.
   */
  byCurrency: ShortlistCurrencyTotal[];
  /** Distinct rows. */
  itemCount: number;
  /** Sum of quantities — how many physical cards. */
  cardCount: number;
}

export function computeShortlistTotals(rows: EnrichedShortlistItem[]): ShortlistTotals {
  const map = new Map<SupportedCurrency, ShortlistCurrencyTotal>();
  for (const r of rows) {
    const entry = map.get(r.askingCurrency) ?? { currency: r.askingCurrency, total: 0, itemCount: 0 };
    entry.total += r.askingTotal;
    entry.itemCount += 1;
    map.set(r.askingCurrency, entry);
  }
  return {
    byCurrency: Array.from(map.values()).sort((a, b) => b.total - a.total),
    itemCount: rows.length,
    cardCount: rows.reduce((sum, r) => sum + r.quantity, 0),
  };
}
