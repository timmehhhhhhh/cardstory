/**
 * One-off backfill: refreshes only Set rows (name/releaseDate/symbolUrl/
 * logoUrl/cardCount) for a game, WITHOUT re-fetching every card the way
 * seed-catalog.ts's full seedGame() does. Exists purely to backfill the new
 * Set.logoUrl column onto already-seeded sets cheaply — delete this file
 * once that backfill has been run for every WIRED game with a logo source.
 *
 * Run with: npx tsx scripts/backfill-set-logos.ts <gameId>
 */
import { PrismaClient } from "@prisma/client";
import { GAME_PROVIDERS } from "@/lib/games/registry";

const db = new PrismaClient();

async function main() {
  const gameId = process.argv[2];
  const provider = gameId && GAME_PROVIDERS[gameId];
  if (!provider) {
    throw new Error(`Unknown or unwired gameId "${gameId}". Wired games: ${Object.keys(GAME_PROVIDERS).join(", ")}`);
  }

  console.log(`[${gameId}] fetching sets…`);
  const sets = await provider.fetchSets();
  console.log(`[${gameId}] got ${sets.length} sets — upserting Set rows only (no card re-fetch)…`);

  let updated = 0;
  for (const set of sets) {
    const setId = `${gameId}:${set.code}`;
    const result = await db.set.updateMany({
      where: { id: setId },
      data: {
        name: set.name,
        releaseDate: set.releaseDate,
        symbolUrl: set.symbolUrl,
        logoUrl: set.logoUrl,
        cardCount: set.cardCount,
      },
    });
    updated += result.count;
  }

  console.log(`[${gameId}] done — ${updated} existing Set rows updated (of ${sets.length} fetched).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
