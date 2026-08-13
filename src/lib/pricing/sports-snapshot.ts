import type { PrismaClient } from "@prisma/client";
import type { GradedPriceValues } from "@/lib/pricing/pricecharting/mapper";
import { todayDateString } from "@/lib/pricing/snapshot";

/**
 * Same idempotent "one real snapshot per item per day" pattern as
 * upsertPriceSnapshot/GradedPriceSnapshot — SportsCardsPro also only
 * exposes current values, no history, so we build history ourselves.
 */
export async function upsertSportsCardPriceSnapshot(
  db: PrismaClient,
  sportsCardItemId: string,
  values: GradedPriceValues,
  capturedDate: string = todayDateString()
) {
  return db.$transaction(async (tx) => {
    await tx.sportsCardPriceSnapshot.upsert({
      where: { sportsCardItemId_capturedDate: { sportsCardItemId, capturedDate } },
      create: { sportsCardItemId, capturedDate, ...values },
      update: { ...values, capturedAt: new Date() },
    });

    const prev = await tx.sportsCardPriceSnapshot.findFirst({
      where: { sportsCardItemId, capturedDate: { lt: capturedDate } },
      orderBy: { capturedDate: "desc" },
    });
    const prevRaw = prev?.loosePrice ? Number(prev.loosePrice) : null;
    const changePct =
      prevRaw && prevRaw > 0 && values.loosePrice != null
        ? ((values.loosePrice - prevRaw) / prevRaw) * 100
        : null;

    await tx.sportsCardItem.update({
      where: { id: sportsCardItemId },
      data: {
        latestPriceRaw: values.loosePrice,
        latestPriceDate: capturedDate,
        prevPriceRaw: prevRaw,
        priceChangePct: changePct,
      },
    });
  });
}
