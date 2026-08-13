import { db } from "@/lib/db";
import type { PriceHistoryRange } from "@/lib/constants";

const RANGE_DAYS: Record<PriceHistoryRange, number> = {
  "1M": 31,
  "3M": 92,
  "6M": 183,
  "1Y": 366,
};

export interface PricePoint {
  date: string; // "YYYY-MM-DD"
  priceRaw: number | null;
}

export async function getPriceHistory(
  catalogItemId: string,
  range: PriceHistoryRange
): Promise<PricePoint[]> {
  const days = RANGE_DAYS[range];
  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromDate = from.toISOString().slice(0, 10);

  const rows = await db.priceSnapshot.findMany({
    where: { catalogItemId, capturedDate: { gte: fromDate } },
    orderBy: { capturedDate: "asc" },
    select: { capturedDate: true, priceRaw: true },
  });

  return rows.map((r) => ({
    date: r.capturedDate,
    priceRaw: r.priceRaw != null ? Number(r.priceRaw) : null,
  }));
}
