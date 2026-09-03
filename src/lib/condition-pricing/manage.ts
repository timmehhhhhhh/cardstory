import { db } from "@/lib/db";
import { resolveConditionPricing } from "@/lib/condition-pricing/resolve";
import type { ConditionPricing } from "@/lib/condition-pricing/types";

/**
 * Server-side reads/writes of the per-account condition -> percentage map.
 *
 * Stored as a plain Json column on User (like hidePricing's Boolean) rather
 * than its own table: there is exactly one of these per user, it is five
 * numbers, and nothing ever queries across it.
 */
export async function getConditionPricing(userId: string): Promise<ConditionPricing> {
  const row = await db.user.findUnique({
    where: { id: userId },
    select: { conditionPricing: true },
  });
  return resolveConditionPricing(row?.conditionPricing);
}

export async function setConditionPricing(
  userId: string,
  pricing: ConditionPricing
): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { conditionPricing: pricing } });
}
