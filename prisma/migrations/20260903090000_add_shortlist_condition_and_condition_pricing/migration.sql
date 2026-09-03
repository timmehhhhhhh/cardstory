-- Condition-based pricing for the In-Store Shortlist.
--
-- shortlist_items.rawCondition: what shape this specific copy is in, one of
-- NM/LP/MP/HP/DMG. Nullable — a row is usually created before anyone has
-- looked at the card's edges. See src/lib/shortlist/types.ts.
--
-- users.conditionPricing: that user's condition -> percentage-of-market map.
-- Nullable; null means "never customised" and reads fall back to
-- DEFAULT_CONDITION_PRICING. See src/lib/condition-pricing/resolve.ts.

-- AlterTable
ALTER TABLE "shortlist_items" ADD COLUMN     "rawCondition" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "conditionPricing" JSONB;
