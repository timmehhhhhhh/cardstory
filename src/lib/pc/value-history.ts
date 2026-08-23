import { db } from "@/lib/db";
import type { PCChartRange } from "@/lib/constants";

const RANGE_DAYS: Record<PCChartRange, number> = {
  "1D": 1,
  "7D": 7,
  "1M": 31,
  "3M": 92,
  "6M": 183,
  MAX: 3650,
};

export interface HoldingRef {
  catalogItemId: string;
  quantity: number;
  /** ISO datetime, or null when the user hasn't set a Date Acquired yet — see `createdAt` fallback below. */
  acquiredAt: string | null;
  /** ISO datetime the holding was added to CardStory — the fallback plotting date when acquiredAt is unset. */
  createdAt: string;
}

export interface ValuePoint {
  date: string;
  value: number;
}

/**
 * Reconstructs a real daily pc value series from PriceSnapshot rows
 * (never fabricated) — forward-fills each item's last known price across
 * days it wasn't re-snapshotted, and only counts a holding from the day it
 * was acquired onward.
 */
export async function computePCValueHistory(
  holdings: HoldingRef[],
  range: PCChartRange
): Promise<ValuePoint[]> {
  if (holdings.length === 0) return [];
  const ids = Array.from(new Set(holdings.map((h) => h.catalogItemId)));

  const from = new Date();
  from.setDate(from.getDate() - RANGE_DAYS[range]);
  const fromDate = from.toISOString().slice(0, 10);

  const snapshots = await db.priceSnapshot.findMany({
    where: { catalogItemId: { in: ids }, capturedDate: { gte: fromDate } },
    orderBy: { capturedDate: "asc" },
    select: { catalogItemId: true, capturedDate: true, priceRaw: true },
  });

  const dates = Array.from(new Set(snapshots.map((s) => s.capturedDate))).sort();
  if (dates.length === 0) return [];

  const byDate = new Map<string, typeof snapshots>();
  for (const s of snapshots) {
    const list = byDate.get(s.capturedDate) ?? [];
    list.push(s);
    byDate.set(s.capturedDate, list);
  }

  const lastKnownPrice = new Map<string, number>();
  const points: ValuePoint[] = [];

  for (const date of dates) {
    for (const s of byDate.get(date) ?? []) {
      if (s.priceRaw != null) lastKnownPrice.set(s.catalogItemId, Number(s.priceRaw));
    }
    const cutoff = new Date(`${date}T23:59:59.999Z`);
    let total = 0;
    for (const h of holdings) {
      // A holding with no Date Acquired yet is still plotted, just from the
      // day it was added to CardStory instead of a physical acquisition date.
      const plottedFrom = h.acquiredAt ?? h.createdAt;
      if (new Date(plottedFrom) > cutoff) continue;
      const price = lastKnownPrice.get(h.catalogItemId);
      if (price != null) total += price * h.quantity;
    }
    points.push({ date, value: total });
  }

  return points;
}
