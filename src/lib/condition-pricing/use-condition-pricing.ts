"use client";

import { useQuery } from "@tanstack/react-query";
import { DEFAULT_CONDITION_PRICING } from "@/lib/constants";
import { resolveConditionPricing } from "@/lib/condition-pricing/resolve";
import type { ConditionPricing } from "@/lib/condition-pricing/types";

export const CONDITION_PRICING_QUERY_KEY = ["condition-pricing"] as const;

/**
 * The signed-in user's condition percentages.
 *
 * Seeded with DEFAULT_CONDITION_PRICING via initialData rather than
 * returning undefined while it loads: the shortlist renders a money figure
 * off this, and a row that shows nothing for a beat and then a number is
 * worse than one that shows the default and then corrects itself — the
 * defaults are what the great majority of accounts are on anyway. Cached
 * for five minutes; this changes about as often as a currency preference.
 */
export function useConditionPricing(): ConditionPricing {
  const { data } = useQuery({
    queryKey: CONDITION_PRICING_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/account/condition-pricing");
      if (!res.ok) throw new Error("Failed to load condition pricing");
      const json = (await res.json()) as { pricing: unknown };
      return resolveConditionPricing(json.pricing);
    },
    staleTime: 5 * 60_000,
    initialData: DEFAULT_CONDITION_PRICING,
  });
  return data;
}
