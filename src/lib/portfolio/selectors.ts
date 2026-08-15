import { holdingKind, type Holding } from "@/lib/portfolio/types";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";
import type { SportsCardItemDetail } from "@/lib/sportscards/manage";
import { getGameMeta } from "@/lib/games/registry";
import { getSportMeta } from "@/lib/sports/registry";

/** Fields the UI needs that differ in shape between a TCG card and a sports card. */
export interface DisplayInfo {
  name: string;
  subtitle: string;
  imageUrl: string | null;
  /** Link target, or null when there's no detail page for this item kind (sports cards, in v1). */
  href: string | null;
  /** Grouping key for "Collections by game" — a TCG gameId or `sports:<SPORT>`. */
  groupKey: string;
  groupLabel: string;
  priceChangePct: number | null;
}

export interface EnrichedHolding extends Holding {
  catalogItem: CatalogItemDetail | undefined;
  sportsCardItem: SportsCardItemDetail | undefined;
  display: DisplayInfo;
  unitPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPct: number | null;
}

function serialSuffix(holding: Holding, sportsCardItem: SportsCardItemDetail | undefined): string {
  if (holding.serialNumber && sportsCardItem?.serialLimit) {
    return ` · ${holding.serialNumber}/${sportsCardItem.serialLimit}`;
  }
  if (holding.serialNumber) return ` · #${holding.serialNumber}`;
  if (sportsCardItem?.serialLimit) return ` · /${sportsCardItem.serialLimit}`;
  return "";
}

function buildDisplay(
  holding: Holding,
  catalogItem: CatalogItemDetail | undefined,
  sportsCardItem: SportsCardItemDetail | undefined
): DisplayInfo {
  if (holdingKind(holding) === "sports" && sportsCardItem) {
    const sport = getSportMeta(sportsCardItem.sport);
    const parallelBit = sportsCardItem.parallelName ? ` · ${sportsCardItem.parallelName}` : " · Base";
    // Always rendered in the structural order [year] [distributor]
    // [setName], e.g. "2020 Panini Mosaic" — year/distributor/setName are
    // stored as separate fields specifically so this order never depends
    // on how a user happened to type a single free-text set field.
    const setBit = [sportsCardItem.year, sportsCardItem.distributor, sportsCardItem.setName]
      .filter(Boolean)
      .join(" ");
    return {
      name: sportsCardItem.playerName,
      subtitle: `${setBit}${parallelBit}${serialSuffix(holding, sportsCardItem)}`,
      // The owner's own photo of this copy wins over the shared catalog image.
      imageUrl: holding.imageUrl ?? sportsCardItem.imageUrl,
      href: null,
      groupKey: `sports:${sportsCardItem.sport}`,
      groupLabel: sport?.name ?? sportsCardItem.sport,
      priceChangePct: sportsCardItem.priceChangePct,
    };
  }

  return {
    name: catalogItem?.name ?? "Unknown card",
    subtitle: catalogItem
      ? `${catalogItem.setName}${catalogItem.number ? ` · ${catalogItem.number}` : ""}`
      : "",
    imageUrl: holding.imageUrl ?? catalogItem?.imageSmallUrl ?? null,
    href: catalogItem ? `/card/${catalogItem.gameId}/${catalogItem.externalId}` : null,
    groupKey: catalogItem?.gameId ?? "unknown",
    groupLabel: catalogItem ? (getGameMeta(catalogItem.gameId)?.name ?? catalogItem.gameId) : "Unknown",
    priceChangePct: catalogItem?.priceChangePct ?? null,
  };
}

export function enrichHoldings(
  holdings: Holding[],
  catalogItems: CatalogItemDetail[],
  sportsCardItems: SportsCardItemDetail[] = []
): EnrichedHolding[] {
  const catalogById = new Map(catalogItems.map((c) => [c.id, c]));
  const sportsById = new Map(sportsCardItems.map((c) => [c.id, c]));

  return holdings.map((h) => {
    const kind = holdingKind(h);
    const catalogItem = kind === "tcg" && h.catalogItemId ? catalogById.get(h.catalogItemId) : undefined;
    const sportsCardItem =
      kind === "sports" && h.sportsCardItemId ? sportsById.get(h.sportsCardItemId) : undefined;

    const unitPrice = (kind === "sports" ? sportsCardItem?.priceRaw : catalogItem?.priceRaw) ?? 0;
    const marketValue = unitPrice * h.quantity;
    const gainLoss = marketValue - h.costBasisTotal;
    const gainLossPct = h.costBasisTotal > 0 ? (gainLoss / h.costBasisTotal) * 100 : null;
    const display = buildDisplay(h, catalogItem, sportsCardItem);

    return { ...h, catalogItem, sportsCardItem, display, unitPrice, marketValue, gainLoss, gainLossPct };
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
  groupKey: string;
  groupLabel: string;
  value: number;
  itemCount: number;
}

export function groupByGame(rows: EnrichedHolding[]): GameGroupTotal[] {
  const map = new Map<string, GameGroupTotal>();
  for (const r of rows) {
    const g = map.get(r.display.groupKey) ?? {
      groupKey: r.display.groupKey,
      groupLabel: r.display.groupLabel,
      value: 0,
      itemCount: 0,
    };
    g.value += r.marketValue;
    g.itemCount += r.quantity;
    map.set(r.display.groupKey, g);
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

export function topByValue(rows: EnrichedHolding[], n: number): EnrichedHolding[] {
  return [...rows].sort((a, b) => b.marketValue - a.marketValue).slice(0, n);
}

export function topByChange(rows: EnrichedHolding[], n: number, direction: "up" | "down"): EnrichedHolding[] {
  const withChange = rows.filter((r) => r.display.priceChangePct != null);
  const sorted = [...withChange].sort((a, b) => {
    const av = a.display.priceChangePct!;
    const bv = b.display.priceChangePct!;
    return direction === "up" ? bv - av : av - bv;
  });
  return sorted.slice(0, n);
}
