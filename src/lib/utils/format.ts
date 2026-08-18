import type { SupportedCurrency } from "@/lib/constants";
import { FX_RATES_TO_USD } from "@/lib/constants";

export function convertFromUsd(usd: number, currency: SupportedCurrency): number {
  return usd * FX_RATES_TO_USD[currency];
}

export function formatMoney(
  amountUsd: number | null | undefined,
  currency: SupportedCurrency = "USD"
): string {
  if (amountUsd == null) return "—";
  const converted = convertFromUsd(amountUsd, currency);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
}

/**
 * Formats an amount that is ALREADY denominated in `currency` — no FX
 * conversion. Use for amounts the user typed in (a shortlist asking price,
 * a cost basis); use formatMoney for USD-denominated market values, which
 * is what every price coming out of the catalog is.
 */
export function formatMoneyIn(
  amount: number | null | undefined,
  currency: SupportedCurrency = "USD"
): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPct(pct: number | null | undefined): string {
  if (pct == null) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatCompactMoney(
  amountUsd: number | null | undefined,
  currency: SupportedCurrency = "USD"
): string {
  if (amountUsd == null) return "—";
  const converted = convertFromUsd(amountUsd, currency);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(converted);
}
