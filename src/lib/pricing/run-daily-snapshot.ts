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
        // One externalId can now back more than one CatalogItem row — one
        // per priced finish/variant (currently only Pokémon; see
        // mapPokemonCardVariants). Keying this lookup by externalId alone
        // would resolve every finish's fresh price onto the SAME (whichever
        // catalogItemId that externalId used to map to) row, silently
        // corrupting price history for every multi-finish card — so the
        // lookup must be keyed by (externalId, variantKey) instead, matching
        // exactly how scripts/seed-catalog.ts derives each row's id.
        const existing = await db.catalogItem.findMany({
          where: { setId: set.id },
          select: { id: true, externalId: true, variantKey: true },
        });
        const idByExternalAndVariant = new Map(
          existing.map((c) => [`${c.externalId}::${c.variantKey}`, c.id])
        );

        const cards = await provider.fetchCardsForSet(set.code);
        for (const card of cards) {
          if (!card.price) continue;
          const catalogItemId = idByExternalAndVariant.get(`${card.externalId}::${card.variantKey ?? ""}`);
          if (!catalogItemId) continue; // don't add new catalog items here — that's seed-catalog.ts's job
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
