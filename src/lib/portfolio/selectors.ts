import type { Holding } from "@/lib/portfolio/types";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";

export interface EnrichedHolding extends Holding {
  catalogItem: CatalogItemDetail | undefined;
  unitPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPct: number | null;
}

export function enrichHoldings(
  holdings: Holding[],
  catalogItems: CatalogItemDetail[]
): EnrichedHolding[] {
  const byId = new Map(catalogItems.map((c) => [c.id, c]));
  return holdings.map((h) => {
    const catalogItem = byId.get(h.catalogItemId);
    const unitPrice = catalogItem?.priceRaw ?? 0;
    const marketValue = unitPrice * h.quantity;
    const gainLoss = marketValue - h.costBasisTotal;
    const gainLossPct = h.costBasisTotal > 0 ? (gainLoss / h.costBasisTotal) * 100 : null;
    return { ...h, catalogItem, unitPrice, marketValue, gainLoss, gainLossPct };
  });
}

export interface PortfolioTotals {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPct: number | null;
}

export function computeTotals(rows: EnrichedHolding[]): PortfolioTotals {
  const totalValue = rows.reduce((sum, r) => sum + r.marketValue, 0);
  const totalCostBasis = rows.reduce((sum, r) => sum + r.costBasisTotal, 0);
  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPct = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : null;
  return { totalValue, totalCostBasis, totalGainLoss, totalGainLossPct };
}

export interface GameGroupTotal {
  gameId: string;
  value: number;
  itemCount: number;
}

export function groupByGame(rows: EnrichedHolding[]): GameGroupTotal[] {
  const map = new Map<string, GameGroupTotal>();
  for (const r of rows) {
    const gameId = r.catalogItem?.gameId ?? "unknown";
    const g = map.get(gameId) ?? { gameId, value: 0, itemCount: 0 };
    g.value += r.marketValue;
    g.itemCount += r.quantity;
    map.set(gameId, g);
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

export function topByValue(rows: EnrichedHolding[], n: number): EnrichedHolding[] {
  return [...rows].sort((a, b) => b.marketValue - a.marketValue).slice(0, n);
}

export function topByChange(rows: EnrichedHolding[], n: number, direction: "up" | "down"): EnrichedHolding[] {
  const withChange = rows.filter((r) => r.catalogItem?.priceChangePct != null);
  const sorted = [...withChange].sort((a, b) => {
    const av = a.catalogItem!.priceChangePct!;
    const bv = b.catalogItem!.priceChangePct!;
    return direction === "up" ? bv - av : av - bv;
  });
  return sorted.slice(0, n);
}
