import { holdingIsCustom, holdingKind, type Holding, type HoldingKind } from "@/lib/pc/types";
import type { CatalogItemDetail } from "@/lib/catalog/by-ids";
import type { SportsCardItemDetail } from "@/lib/sportscards/manage";
import { getGameMeta } from "@/lib/games/registry";
import { getSportMeta } from "@/lib/sports/registry";
import { cardDetailHref } from "@/lib/catalog/card-href";

/** Fields the UI needs that differ in shape between a TCG card and a sports card. */
export interface DisplayInfo {
  name: string;
  subtitle: string;
  /** The card's number within its set (e.g. "88", "025/198"), when known. */
  number: string | null;
  imageUrl: string | null;
  /**
   * Parallel label watermarked over the image, for sports cards only.
   * `inherited` means imageUrl is the checklist group's base-card photo
   * rather than a scan of this parallel — see ParallelBadge.
   */
  imageWatermark: { parallelName: string; serialLimit: string | null; inherited: boolean } | null;
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
  /** priceAtAcquisition * quantity — pairs with marketValue/costBasisTotal, which are also totals. Null when priceAtAcquisition isn't known. */
  priceAtAcquisitionTotal: number | null;
}

function serialSuffix(
  ref: Pick<CardRef, "serialNumber">,
  sportsCardItem: SportsCardItemDetail | undefined
): string {
  if (ref.serialNumber && sportsCardItem?.serialLimit) {
    return ` · ${ref.serialNumber}/${sportsCardItem.serialLimit}`;
  }
  if (ref.serialNumber) return ` · #${ref.serialNumber}`;
  if (sportsCardItem?.serialLimit) return ` · /${sportsCardItem.serialLimit}`;
  return "";
}

/**
 * The subset of a Holding that buildDisplay actually reads. Kept structural
 * rather than `Holding` so other card references can borrow the same
 * rendering rules without faking ownership fields they don't have — the
 * In-Store Shortlist (src/lib/shortlist/selectors.ts) passes one of these.
 */
export interface CardRef {
  kind?: HoldingKind;
  sportsCardItemId?: string;
  imageUrl?: string;
  serialNumber?: string;
  customName?: string;
}

export function buildDisplay(
  ref: CardRef,
  catalogItem: CatalogItemDetail | undefined,
  sportsCardItem: SportsCardItemDetail | undefined
): DisplayInfo {
  if (holdingKind(ref) === "sports" && sportsCardItem) {
    const sport = getSportMeta(sportsCardItem.sport);
    const parallelBit = sportsCardItem.parallelName ? ` · ${sportsCardItem.parallelName}` : " · Base";
    // Always rendered in the structural order [year] [distributor]
    // [setName], e.g. "2020 Panini Mosaic" — year/distributor/setName are
    // stored as separate fields specifically so this order never depends
    // on how a user happened to type a single free-text set field.
    const setBit = [sportsCardItem.year, sportsCardItem.distributor, sportsCardItem.setName]
      .filter(Boolean)
      .join(" ");
    const numberBit = sportsCardItem.cardNumber ? ` · #${sportsCardItem.cardNumber}` : "";
    return {
      name: sportsCardItem.playerName,
      subtitle: `${setBit}${numberBit}${parallelBit}${serialSuffix(ref, sportsCardItem)}`,
      number: sportsCardItem.cardNumber,
      // The owner's own photo of this copy wins over the shared catalog image.
      imageUrl: ref.imageUrl ?? sportsCardItem.imageUrl,
      imageWatermark: sportsCardItem.parallelName
        ? {
            parallelName: sportsCardItem.parallelName,
            serialLimit: sportsCardItem.serialLimit,
            // Their own photo is of their actual copy, so it isn't inherited
            // even when the shared row's image is.
            inherited: !ref.imageUrl && sportsCardItem.imageIsInherited,
          }
        : null,
      href: null,
      groupKey: `sports:${sportsCardItem.sport}`,
      groupLabel: sport?.name ?? sportsCardItem.sport,
      priceChangePct: sportsCardItem.priceChangePct,
    };
  }

  return {
    name: catalogItem?.name ?? ref.customName ?? "Unknown card",
    subtitle: catalogItem
      ? `${catalogItem.setName}${catalogItem.number ? ` · ${catalogItem.number}` : ""}`
      : "",
    number: catalogItem?.number ?? null,
    imageUrl: ref.imageUrl ?? catalogItem?.imageSmallUrl ?? null,
    imageWatermark: null,
    href: catalogItem ? cardDetailHref(catalogItem.gameId, catalogItem.id, false) : null,
    groupKey: catalogItem?.gameId ?? (ref.customName ? "custom" : "unknown"),
    groupLabel: catalogItem
      ? (getGameMeta(catalogItem.gameId)?.name ?? catalogItem.gameId)
      : ref.customName
        ? "Custom"
        : "Unknown",
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
    // A hand-keyed holding has no catalog row and therefore no market price
    // at all. Treating that absence as $0 would report the full cost basis
    // as a 100% loss, so gain/loss is reported as unknown instead — and
    // computeTotals leaves its cost basis out of the portfolio-level
    // percentage for the same reason.
    const custom = holdingIsCustom(h);
    const gainLoss = custom ? 0 : marketValue - h.costBasisTotal;
    const gainLossPct = !custom && h.costBasisTotal > 0 ? (gainLoss / h.costBasisTotal) * 100 : null;
    const priceAtAcquisitionTotal = h.priceAtAcquisition != null ? h.priceAtAcquisition * h.quantity : null;
    const display = buildDisplay(h, catalogItem, sportsCardItem);

    return {
      ...h,
      catalogItem,
      sportsCardItem,
      display,
      unitPrice,
      marketValue,
      gainLoss,
      gainLossPct,
      priceAtAcquisitionTotal,
    };
  });
}

export interface PCTotals {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPct: number | null;
}

export function computeTotals(rows: EnrichedHolding[]): PCTotals {
  const totalValue = rows.reduce((sum, r) => sum + r.marketValue, 0);
  // Custom rows contribute no market value (they have no catalog row), so
  // counting their cost basis here would show every one of them as a total
  // loss against the portfolio — see the matching exclusion in enrichHoldings.
  const totalCostBasis = rows
    .filter((r) => !holdingIsCustom(r))
    .reduce((sum, r) => sum + r.costBasisTotal, 0);
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
