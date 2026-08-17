import type { SupportedCurrency } from "@/lib/constants";

export interface ShowcaseItem {
  catalogItemId: string;
  gameId: string;
  externalId: string;
  name: string;
  number: string | null;
  imageSmallUrl: string | null;
  quantity: number;
  marketValue: number;
}

/** A point-in-time snapshot published from a local-only pc. */
export interface ShowcasePayload {
  pcName: string;
  currency: SupportedCurrency;
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPct: number | null;
  itemCount: number;
  items: ShowcaseItem[];
}
