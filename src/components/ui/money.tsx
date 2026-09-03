"use client";

import { formatCompactMoney, formatMoney, formatMoneyIn } from "@/lib/utils/format";
import { usePricingVisible } from "@/lib/utils/use-pricing-visible";
import type { SupportedCurrency } from "@/lib/constants";

/**
 * When the signed-in user has turned on "Hide pricing & values" in
 * /settings (see src/lib/utils/use-pricing-visible.ts), Money/MoneyIn/
 * CompactMoney render nothing at all rather than a "••••" placeholder —
 * the point of the setting is that pricing should look like it was never
 * in the UI to begin with, not visibly redacted (which just invites a
 * curious viewer to flip the setting off). Rendering `null` lets the
 * surrounding flex/grid layout collapse the space naturally; callers whose
 * layout would otherwise leave a lopsided gap (e.g. a "label: amount" row)
 * should conditionally skip the label too via usePricingVisible(), the same
 * hook this reads.
 */
export function Money({
  amountUsd,
  currency = "USD",
  className,
}: {
  amountUsd: number | null | undefined;
  currency?: SupportedCurrency;
  className?: string;
}) {
  const visible = usePricingVisible();
  if (!visible) return null;
  return <span className={className}>{formatMoney(amountUsd, currency)}</span>;
}

/** For amounts already denominated in `currency` — see formatMoneyIn. */
export function MoneyIn({
  amount,
  currency = "USD",
  className,
}: {
  amount: number | null | undefined;
  currency?: SupportedCurrency;
  className?: string;
}) {
  const visible = usePricingVisible();
  if (!visible) return null;
  return <span className={className}>{formatMoneyIn(amount, currency)}</span>;
}

export function CompactMoney({
  amountUsd,
  currency = "USD",
  className,
}: {
  amountUsd: number | null | undefined;
  currency?: SupportedCurrency;
  className?: string;
}) {
  const visible = usePricingVisible();
  if (!visible) return null;
  return <span className={className}>{formatCompactMoney(amountUsd, currency)}</span>;
}
