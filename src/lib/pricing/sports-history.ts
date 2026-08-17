import { db } from "@/lib/db";
import type { PriceHistoryRange } from "@/lib/constants";
import type { PricePoint } from "@/lib/pricing/history";

const RANGE_DAYS: Record<PriceHistoryRange, number> = {
  "1M": 31,
  "3M": 92,
  "6M": 183,
  "1Y": 366,
};

/**
 * SportsCardItem analogue of getPriceHistory() (lib/pricing/history.ts) —
 * same range/idempotency shape, reading SportsCardPriceSnapshot's
 * `loosePrice` column (the ungraded reference price) instead of
 * PriceSnapshot's `priceRaw`.
 */
export async function getSportsCardPriceHistory(
  sportsCardItemId: string,
  range: PriceHistoryRange
): Promise<PricePoint[]> {
  const days = RANGE_DAYS[range];
  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromDate = from.toISOString().slice(0, 10);

  const rows = await db.sportsCardPriceSnapshot.findMany({
    where: { sportsCardItemId, capturedDate: { gte: fromDate } },
    orderBy: { capturedDate: "asc" },
    select: { capturedDate: true, loosePrice: true },
  });

  return rows.map((r) => ({
    date: r.capturedDate,
    priceRaw: r.loosePrice != null ? Number(r.loosePrice) : null,
  }));
}

/** SportsCardItem analogue of getPriceAtDate() (lib/pricing/history.ts). */
export async function getSportsCardPriceAtDate(
  sportsCardItemId: string,
  date: string
): Promise<number | null> {
  const row = await db.sportsCardPriceSnapshot.findFirst({
    where: { sportsCardItemId, capturedDate: { lte: date } },
    orderBy: { capturedDate: "desc" },
    select: { loosePrice: true },
  });
  return row?.loosePrice != null ? Number(row.loosePrice) : null;
}
