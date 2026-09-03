import { describe, expect, it } from "vitest";
import { DEFAULT_CONDITION_PRICING } from "@/lib/constants";
import {
  conditionAdjustedPrice,
  isDefaultConditionPricing,
  resolveConditionPricing,
} from "@/lib/condition-pricing/resolve";

/**
 * resolveConditionPricing is the only thing standing between an opaque Json
 * column and a money figure on a shortlist row that someone might act on in
 * a shop, so its tolerance for junk is what's worth pinning down here.
 */
describe("resolveConditionPricing", () => {
  it("falls back to the defaults for a user who has never customised", () => {
    expect(resolveConditionPricing(null)).toEqual(DEFAULT_CONDITION_PRICING);
    expect(resolveConditionPricing(undefined)).toEqual(DEFAULT_CONDITION_PRICING);
    expect(resolveConditionPricing({})).toEqual(DEFAULT_CONDITION_PRICING);
  });

  it("keeps customised values and defaults the rest", () => {
    expect(resolveConditionPricing({ LP: 70, HP: 50 })).toEqual({
      ...DEFAULT_CONDITION_PRICING,
      LP: 70,
      HP: 50,
    });
  });

  it("clamps out-of-range values into 0-100", () => {
    const resolved = resolveConditionPricing({ NM: 500, DMG: -20 });
    expect(resolved.NM).toBe(100);
    expect(resolved.DMG).toBe(0);
  });

  it("rounds fractional percentages", () => {
    expect(resolveConditionPricing({ MP: 74.6 }).MP).toBe(75);
  });

  it("defaults anything that isn't a finite number", () => {
    const resolved = resolveConditionPricing({
      NM: "100",
      LP: NaN,
      MP: Infinity,
      HP: null,
      DMG: { nope: true },
    });
    expect(resolved).toEqual(DEFAULT_CONDITION_PRICING);
  });

  it("survives a non-object column value", () => {
    expect(resolveConditionPricing("nonsense")).toEqual(DEFAULT_CONDITION_PRICING);
    expect(resolveConditionPricing(42)).toEqual(DEFAULT_CONDITION_PRICING);
    expect(resolveConditionPricing([])).toEqual(DEFAULT_CONDITION_PRICING);
  });
});

describe("isDefaultConditionPricing", () => {
  it("is true for the defaults and false once anything differs", () => {
    expect(isDefaultConditionPricing(DEFAULT_CONDITION_PRICING)).toBe(true);
    expect(isDefaultConditionPricing({ ...DEFAULT_CONDITION_PRICING, LP: 84 })).toBe(false);
  });
});

describe("conditionAdjustedPrice", () => {
  const pricing = DEFAULT_CONDITION_PRICING;

  it("applies each condition's percentage to the market price", () => {
    expect(conditionAdjustedPrice(40, "NM", pricing)).toBe(40);
    expect(conditionAdjustedPrice(40, "LP", pricing)).toBe(34);
    expect(conditionAdjustedPrice(40, "MP", pricing)).toBe(30);
    expect(conditionAdjustedPrice(40, "HP", pricing)).toBe(24);
    expect(conditionAdjustedPrice(40, "DMG", pricing)).toBe(16);
  });

  it("uses the caller's own percentages, not the defaults", () => {
    expect(conditionAdjustedPrice(40, "LP", { ...pricing, LP: 50 })).toBe(20);
  });

  it("returns null when there is nothing honest to show", () => {
    // A custom shortlist row has no market price; an uninspected card has
    // no condition. Either way there is no number to put on screen.
    expect(conditionAdjustedPrice(null, "LP", pricing)).toBeNull();
    expect(conditionAdjustedPrice(undefined, "LP", pricing)).toBeNull();
    expect(conditionAdjustedPrice(40, null, pricing)).toBeNull();
    expect(conditionAdjustedPrice(40, undefined, pricing)).toBeNull();
    expect(conditionAdjustedPrice(NaN, "LP", pricing)).toBeNull();
  });

  it("handles a free card without turning it into null", () => {
    expect(conditionAdjustedPrice(0, "LP", pricing)).toBe(0);
  });
});
