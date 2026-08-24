"use client";

import { formatCompactMoney, formatMoney, formatMoneyIn } from "@/lib/utils/format";
import { usePricingVisible } from "@/lib/utils/use-pricing-visible";
import { cn } from "@/lib/utils";
import type { SupportedCurrency } from "@/lib/constants";

/**
 * Renders formatted currency text, masked with a placeholder when the
 * signed-in user has turned on "Hide pricing & values" in
 * /settings (see src/lib/utils/use-pricing-visible.ts). Drop-in
 * replacement for calling the formatMoney* helpers directly in JSX.
 */
function Masked({ className }: { className?: string }) {
  return (
    <span aria-label="Pricing hidden" className={cn("select-none tracking-wider", className)}>
      <span aria-hidden="true">••••</span>
    </span>
  );
}

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
  if (!visible) return <Masked className={className} />;
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
  if (!visible) return <Masked className={className} />;
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
  if (!visible) return <Masked className={className} />;
  return <span className={className}>{formatCompactMoney(amountUsd, currency)}</span>;
}
