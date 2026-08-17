import { db } from "@/lib/db";
import { getSportsCardProductById, isSportsCardsProConfigured } from "@/lib/pricing/sportscardspro/client";
import { mapPriceChartingProduct } from "@/lib/pricing/pricecharting/mapper";
import { upsertSportsCardPriceSnapshot } from "@/lib/pricing/sports-snapshot";

export interface SportsCardSnapshotResult {
  configured: boolean;
  itemsProcessed: number;
  itemsPriced: number;
  errors: string[];
}

/**
 * Refreshes today's price for every SportsCardItem that's already matched
 * to a SportsCardsPro product (has a cached priceChartingId) — i.e. every
 * sports card any local pc has ever added via the search flow.
 * Skipped entirely when unconfigured. Bound by real usage rather than a
 * fixed catalog size (there's no bulk sports-card catalog to sync, unlike
 * the TCG job), so this stays reasonable at 1 req/sec even without an
 * explicit cap.
 */
export async function runSportsCardSnapshot(): Promise<SportsCardSnapshotResult> {
  if (!isSportsCardsProConfigured()) {
    return { configured: false, itemsProcessed: 0, itemsPriced: 0, errors: [] };
  }

  const items = await db.sportsCardItem.findMany({
    where: { priceChartingId: { not: null } },
    select: { id: true, priceChartingId: true },
  });

  let itemsPriced = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      const product = await getSportsCardProductById(item.priceChartingId!);
      if (!product) continue;
      const values = mapPriceChartingProduct(product);
      await upsertSportsCardPriceSnapshot(db, item.id, values);
      itemsPriced += 1;
    } catch (err) {
      errors.push(`${item.id}: ${(err as Error).message}`);
    }
  }

  return { configured: true, itemsProcessed: items.length, itemsPriced, errors };
}
