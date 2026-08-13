import { db } from "@/lib/db";
import { GAME_PROVIDERS } from "@/lib/games/registry";
import { todayDateString, upsertPriceSnapshot } from "@/lib/pricing/snapshot";

export interface GameSnapshotResult {
  gameId: string;
  setsProcessed: number;
  itemsPriced: number;
  errors: string[];
}

/**
 * The daily job: re-fetches current prices for every set we've already
 * catalogued (batched per set, per provider guidance) and records one real
 * PriceSnapshot per catalog item for today. Deliberately does NOT add new
 * catalog items — that's scripts/seed-catalog.ts's job — so this stays a
 * cheap, bounded, idempotent "refresh today's price" operation.
 */
export async function runDailySnapshot(): Promise<GameSnapshotResult[]> {
  const capturedDate = todayDateString();
  const results: GameSnapshotResult[] = [];

  for (const [gameId, provider] of Object.entries(GAME_PROVIDERS)) {
    const sets = await db.set.findMany({ where: { gameId } });
    let itemsPriced = 0;
    const errors: string[] = [];

    for (const set of sets) {
      try {
        const existing = await db.catalogItem.findMany({
          where: { setId: set.id },
          select: { externalId: true },
        });
        const knownExternalIds = new Set(existing.map((c) => c.externalId));

        const cards = await provider.fetchCardsForSet(set.code);
        for (const card of cards) {
          if (!card.price || !knownExternalIds.has(card.externalId)) continue;
          const catalogItemId = `${gameId}:${card.externalId}`;
          await upsertPriceSnapshot(db, catalogItemId, card.price, capturedDate);
          itemsPriced += 1;
        }
      } catch (err) {
        errors.push(`${set.code}: ${(err as Error).message}`);
      }
    }

    results.push({ gameId, setsProcessed: sets.length, itemsPriced, errors });
  }

  return results;
}
