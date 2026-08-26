/**
 * One-time backfill: writes CatalogItem.nationalPokedexNumbers for every
 * already-seeded Pokémon card (English and non-English alike) that predates
 * this field. Re-fetches each affected set via the same GameProvider
 * scripts/seed-catalog.ts uses (pokemontcg.io for English, tcgdex.net for
 * JP/CN/TW/KR — see lib/games/pokemon/client.ts), so it reuses the exact
 * same mapper logic as the live path (mapPokemonCardVariants/
 * mapTcgdexCardVariants) rather than re-deriving anything — cheaper than a
 * full `npm run seed:catalog` re-run since it only re-fetches sets that
 * actually have a gap. Going forward, new/re-seeded rows get this field
 * directly from scripts/seed-catalog.ts.
 *
 * Not fully idempotent-by-diff (it writes every card in a re-fetched set,
 * not just the ones that were actually empty), but every write is the exact
 * value the live seed would already write, so re-running is harmless.
 *
 * Run with: npx tsx scripts/backfill-catalog-national-dex-numbers.ts [--dry-run]
 */
import { db } from "@/lib/db";
import { GAME_PROVIDERS } from "@/lib/games/registry";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const provider = GAME_PROVIDERS.pokemon;
  if (!provider) throw new Error("Pokémon provider not registered in lib/games/registry.ts");

  const staleSets = await db.catalogItem.findMany({
    where: { gameId: "pokemon", nationalPokedexNumbers: { isEmpty: true } },
    select: { setId: true },
    distinct: ["setId"],
  });

  const sets = await db.set.findMany({
    where: { id: { in: staleSets.map((s) => s.setId) } },
    select: { id: true, code: true },
  });

  let updated = 0;
  let nonPokemonCards = 0;
  const setsFailed: string[] = [];

  for (const [i, set] of sets.entries()) {
    console.log(`[${i + 1}/${sets.length}] ${set.id}`);
    let cards;
    try {
      cards = await provider.fetchCardsForSet(set.code);
    } catch (err) {
      console.warn(`  skipping after fetch failure:`, (err as Error).message);
      setsFailed.push(set.id);
      continue;
    }

    // Same primary/variant id scheme as seed-catalog.ts — the first card for
    // a given externalId owns the unsuffixed id, subsequent ones (extra
    // priced finishes) own the ":<variantKey>"-suffixed id.
    const seenExternalIds = new Set<string>();
    for (const card of cards) {
      const isPrimary = !seenExternalIds.has(card.externalId);
      seenExternalIds.add(card.externalId);
      const catalogItemId = isPrimary
        ? `pokemon:${card.externalId}`
        : `pokemon:${card.externalId}:${card.variantKey}`;

      const numbers = card.nationalPokedexNumbers ?? [];
      if (numbers.length === 0) {
        nonPokemonCards += 1; // Trainer/Energy — expected, not a failure.
        continue;
      }
      if (!dryRun) {
        try {
          await db.catalogItem.update({ where: { id: catalogItemId }, data: { nationalPokedexNumbers: numbers } });
        } catch {
          continue; // Row doesn't exist (e.g. a printing this catalog never seeded) — not this script's job to create it.
        }
      }
      updated += 1;
    }
  }

  console.log(`\n${dryRun ? "[dry run] " : ""}Stale sets found: ${sets.length}`);
  console.log(`Pokémon cards backfilled: ${updated}`);
  console.log(`Non-Pokémon cards seen (no dex number — expected): ${nonPokemonCards}`);
  if (setsFailed.length > 0) console.log(`Sets that failed to fetch: ${setsFailed.join(", ")}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
