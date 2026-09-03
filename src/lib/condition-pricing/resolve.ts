import {
  CARD_CONDITIONS,
  DEFAULT_CONDITION_PRICING,
  type RawCardCondition,
} from "@/lib/constants";
import type { ConditionPricing } from "@/lib/condition-pricing/types";

/**
 * Turns whatever is in User.conditionPricing (an opaque Json column — see
 * prisma/schema.prisma) into a complete, sane ConditionPricing.
 *
 * Every read path funnels through here rather than casting the Json blob,
 * because the column can legitimately be null (never customised), can be a
 * short map written by an older version of the settings UI, and — being
 * Json — can be anything at all if a row is ever edited by hand. The
 * alternative is a NaN reaching a price on a shortlist row, which is the
 * one number in this feature a user might act on in a shop.
 */
export function resolveConditionPricing(raw: unknown): ConditionPricing {
  const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const out = {} as ConditionPricing;
  for (const condition of CARD_CONDITIONS) {
    const value = source[condition];
    out[condition] =
      typeof value === "number" && Number.isFinite(value)
        ? Math.min(100, Math.max(0, Math.round(value)))
        : DEFAULT_CONDITION_PRICING[condition];
  }
  return out;
}

/** True when `pricing` matches the built-in defaults exactly. */
export function isDefaultConditionPricing(pricing: ConditionPricing): boolean {
  return CARD_CONDITIONS.every((c) => pricing[c] === DEFAULT_CONDITION_PRICING[c]);
}

/**
 * What a card is worth given its condition — the single place the
 * percentage is ever applied.
 *
 * `marketPrice` is whatever currency the caller is already working in
 * (the shortlist passes a figure already converted into the row's asking
 * currency), since a percentage is currency-agnostic. Null in, null out:
 * a custom row has no market price and an uninspected card has no
 * condition, and in both cases there is nothing honest to display.
 */
export function conditionAdjustedPrice(
  marketPrice: number | null | undefined,
  condition: RawCardCondition | null | undefined,
  pricing: ConditionPricing
): number | null {
  if (marketPrice == null || !Number.isFinite(marketPrice)) return null;
  if (!condition) return null;
  return (marketPrice * pricing[condition]) / 100;
}
