import type { PrismaClient } from "@prisma/client";
import type { UnifiedCard } from "@/lib/games/types";

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Idempotently records one price row per catalog item per day, and keeps
 * CatalogItem's denormalized latest/prev price cache in sync in the same
 * transaction. Safe to call more than once for the same item on the same
 * day — the unique constraint on (catalogItemId, capturedDate) makes the
 * snapshot write an upsert, not an insert.
 */
export async function upsertPriceSnapshot(
  db: PrismaClient,
  catalogItemId: string,
  price: NonNullable<UnifiedCard["price"]>,
  capturedDate: string = todayDateString()
) {
  return db.$transaction(async (tx) => {
    await tx.priceSnapshot.upsert({
      where: { catalogItemId_capturedDate: { catalogItemId, capturedDate } },
      create: {
        catalogItemId,
        capturedDate,
        currency: price.currency,
        priceRaw: price.raw ?? null,
        priceFoil: price.foil ?? null,
        source: price.source,
      },
      update: {
        currency: price.currency,
        priceRaw: price.raw ?? null,
        priceFoil: price.foil ?? null,
        source: price.source,
        capturedAt: new Date(),
      },
    });

    // The most recent snapshot strictly before this one gives us the
    // day-over-day change. If we're re-running the job for "today" a
    // second time, this correctly still compares against yesterday (not
    // against the row we just wrote), since it's excluded by date.
    const prev = await tx.priceSnapshot.findFirst({
      where: { catalogItemId, capturedDate: { lt: capturedDate } },
      orderBy: { capturedDate: "desc" },
    });

    const prevRaw = prev?.priceRaw ? Number(prev.priceRaw) : null;
    const changePct =
      prevRaw && prevRaw > 0 && price.raw != null ? ((price.raw - prevRaw) / prevRaw) * 100 : null;

    await tx.catalogItem.update({
      where: { id: catalogItemId },
      data: {
        latestPriceRaw: price.raw ?? null,
        latestPriceFoil: price.foil ?? null,
        latestPriceDate: capturedDate,
        prevPriceRaw: prevRaw,
        priceChangePct: changePct,
      },
    });
  });
}
