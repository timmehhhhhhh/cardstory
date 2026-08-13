/**
 * Curated catalog seed: upserts all 19 Game rows (per lib/games/registry),
 * then for each WIRED game (Pokémon, MTG) pulls its N most recent sets and
 * every card in them from the real free APIs, storing both the catalog
 * metadata AND today's real price as the first PriceSnapshot row.
 *
 * Run with: npx tsx scripts/seed-catalog.ts
 * Re-run any time — everything here is an upsert, so it's safe to repeat.
 */
import { PrismaClient } from "@prisma/client";
import { GAMES, GAME_PROVIDERS } from "@/lib/games/registry";
import { upsertPriceSnapshot } from "@/lib/pricing/snapshot";

const SETS_PER_GAME = 6;
const db = new PrismaClient();

async function upsertGames() {
  for (const g of GAMES) {
    await db.game.upsert({
      where: { id: g.id },
      create: { id: g.id, name: g.name, logoUrl: g.shortLabel, status: g.status, sortOrder: g.sortOrder },
      update: { name: g.name, logoUrl: g.shortLabel, status: g.status, sortOrder: g.sortOrder },
    });
  }
  console.log(`Upserted ${GAMES.length} games.`);
}

async function seedGame(gameId: string) {
  const provider = GAME_PROVIDERS[gameId];
  if (!provider) return;

  console.log(`\n[${gameId}] fetching sets…`);
  const sets = (await provider.fetchSets()).slice(0, SETS_PER_GAME);
  console.log(`[${gameId}] seeding ${sets.length} most recent sets:`, sets.map((s) => s.code).join(", "));

  let totalCards = 0;
  let totalPriced = 0;

  for (const set of sets) {
    const setId = `${gameId}:${set.code}`;
    await db.set.upsert({
      where: { id: setId },
      create: {
        id: setId,
        gameId,
        name: set.name,
        code: set.code,
        releaseDate: set.releaseDate,
        symbolUrl: set.symbolUrl,
        cardCount: set.cardCount,
      },
      update: {
        name: set.name,
        releaseDate: set.releaseDate,
        symbolUrl: set.symbolUrl,
        cardCount: set.cardCount,
      },
    });

    let cards;
    try {
      cards = await provider.fetchCardsForSet(set.externalId);
    } catch (err) {
      console.warn(`[${gameId}] skipping ${set.code} after repeated fetch failures:`, (err as Error).message);
      continue;
    }
    for (const card of cards) {
      const catalogItemId = `${gameId}:${card.externalId}`;
      await db.catalogItem.upsert({
        where: { id: catalogItemId },
        create: {
          id: catalogItemId,
          gameId,
          setId,
          externalId: card.externalId,
          name: card.name,
          number: card.number,
          rarity: card.rarity,
          imageSmallUrl: card.imageSmallUrl,
          imageLargeUrl: card.imageLargeUrl,
          productType: card.productType,
          language: card.language,
        },
        update: {
          name: card.name,
          number: card.number,
          rarity: card.rarity,
          imageSmallUrl: card.imageSmallUrl,
          imageLargeUrl: card.imageLargeUrl,
        },
      });
      totalCards += 1;

      if (card.price) {
        await upsertPriceSnapshot(db, catalogItemId, card.price);
        totalPriced += 1;
      }
    }
    console.log(`[${gameId}] ${set.code}: ${cards.length} cards`);
  }

  console.log(`[${gameId}] done — ${totalCards} cards, ${totalPriced} with a real price snapshot.`);
}

async function main() {
  await upsertGames();
  for (const gameId of Object.keys(GAME_PROVIDERS)) {
    await seedGame(gameId);
  }
  console.log("\nCatalog seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
