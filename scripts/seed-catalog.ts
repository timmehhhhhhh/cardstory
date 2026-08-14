/**
 * Curated catalog seed: upserts all 19 Game rows (per lib/games/registry),
 * then for each WIRED game pulls its sets and every card in them from the
 * real free APIs, storing both the catalog metadata AND today's real price
 * as the first PriceSnapshot row (when the provider has pricing — Riftbound
 * currently doesn't, see lib/games/riftbound/mapper.ts). Pokémon and
 * Riftbound both seed their ENTIRE set history (no cap, per
 * SETS_CAP_OVERRIDE below); any other game defaults to just its 6 most
 * recent sets.
 *
 * Run with: npx tsx scripts/seed-catalog.ts [gameId]
 * An optional gameId arg scopes the run to one game (e.g. `riftbound`) —
 * handy for iterating without re-pulling Pokémon's entire multi-hundred-set
 * history every time. Re-run any time — everything here is an upsert, so
 * it's safe to repeat.
 */
import { PrismaClient } from "@prisma/client";
import { GAMES, GAME_PROVIDERS } from "@/lib/games/registry";
import { upsertPriceSnapshot } from "@/lib/pricing/snapshot";

const DEFAULT_SETS_CAP = 6;
// Per-game override: null = no cap (seed every set ever released).
// Pokémon and Riftbound are special-cased here; any newly-wired game safely
// falls back to DEFAULT_SETS_CAP instead of silently inheriting "no cap".
const SETS_CAP_OVERRIDE: Record<string, number | null> = {
  pokemon: null,
  riftbound: null,
};
function setsCapFor(gameId: string): number | null {
  return gameId in SETS_CAP_OVERRIDE ? SETS_CAP_OVERRIDE[gameId] : DEFAULT_SETS_CAP;
}

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
  const allSets = await provider.fetchSets();
  const cap = setsCapFor(gameId);
  const sets = cap != null ? allSets.slice(0, cap) : allSets;
  console.log(
    cap != null
      ? `[${gameId}] seeding ${sets.length} most recent sets: ${sets.map((s) => s.code).join(", ")}`
      : `[${gameId}] seeding all ${sets.length} sets (no cap)`
  );

  let totalCards = 0;
  let totalPriced = 0;
  const startTime = Date.now();

  for (const [i, set] of sets.entries()) {
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
          cardType: card.cardType,
          imageSmallUrl: card.imageSmallUrl,
          imageLargeUrl: card.imageLargeUrl,
          productType: card.productType,
          language: card.language,
        },
        update: {
          name: card.name,
          number: card.number,
          rarity: card.rarity,
          cardType: card.cardType,
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
    const elapsedMin = ((Date.now() - startTime) / 60000).toFixed(1);
    console.log(
      `[${gameId}] (${i + 1}/${sets.length}) ${set.code}: ${cards.length} cards (elapsed ${elapsedMin}m, ${totalCards} total so far)`
    );
  }

  console.log(`[${gameId}] done — ${totalCards} cards, ${totalPriced} with a real price snapshot.`);
}

async function main() {
  await upsertGames();
  const onlyGameId = process.argv[2];
  if (onlyGameId && !GAME_PROVIDERS[onlyGameId]) {
    throw new Error(`Unknown or unwired gameId "${onlyGameId}". Wired games: ${Object.keys(GAME_PROVIDERS).join(", ")}`);
  }
  const gameIds = onlyGameId ? [onlyGameId] : Object.keys(GAME_PROVIDERS);
  for (const gameId of gameIds) {
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
