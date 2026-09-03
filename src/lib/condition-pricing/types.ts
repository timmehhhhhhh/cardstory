import type { RawCardCondition } from "@/lib/constants";

/**
 * A user's condition -> percentage-of-market map. Whole-number percentages
 * (0-100), not multipliers: this is a number the user types into a box in
 * /settings, and "85" is what they think in, not "0.85".
 *
 * Always a complete map — a partially-filled blob out of the database is
 * completed by resolveConditionPricing before anything else sees it, so no
 * consumer ever has to handle a missing condition.
 */
export type ConditionPricing = Record<RawCardCondition, number>;
