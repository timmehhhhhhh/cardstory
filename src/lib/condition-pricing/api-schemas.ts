import { z } from "zod";

/**
 * Capped at 100 on purpose: condition can only ever subtract value from a
 * market price quoted for a Near Mint copy, so a percentage above 100 is a
 * typo rather than a preference. Integers only — the settings UI is five
 * whole-number boxes, and letting 84.999 through would make the "is this
 * still the default?" comparison behind the Reset button unreliable.
 */
const percentage = z.number().int().min(0).max(100);

/**
 * Spelled out rather than derived from CARD_CONDITIONS so the map stays a
 * required-every-key object: a PATCH always writes the whole set, and a
 * payload missing HP should be rejected, not silently defaulted.
 */
export const conditionPricingSchema = z.object({
  NM: percentage,
  LP: percentage,
  MP: percentage,
  HP: percentage,
  DMG: percentage,
});

export type ConditionPricingInput = z.infer<typeof conditionPricingSchema>;
