/**
 * One-time backfill: writes Set.logoUrl for every already-seeded non-English
 * Pokémon Set row from scripts/data/pokemon-set-logos.ts. Cheaper than a
 * full `npm run seed:catalog` re-run (which re-pulls Pokémon's entire
 * multi-hundred-set history over the network — see seed-catalog.ts's header
 * comment) since this only needs the Set table, not a live provider fetch.
 * Going forward, new sets get `logoUrl` directly from
 * mapTcgdexSet/seed-catalog.ts (see lib/games/pokemon/mapper.ts) — this
 * script only exists to catch up rows seeded before that table had an
 * entry for their code. Mirrors scripts/backfill-set-name-en.ts.
 *
 * Safe to re-run: every write is keyed by Set.id, only touches rows whose
 * code has a table entry, and skips rows that already have a logoUrl (so it
 * never clobbers a value set some other way).
 *
 * Run with: npx tsx scripts/backfill-set-logo-url.ts
 */
import { db } from "@/lib/db";
import { POKEMON_SET_LOGOS } from "./data/pokemon-set-logos";

async function main() {
  const sets = await db.set.findMany({
    where: { gameId: "pokemon" },
    select: { id: true, code: true, logoUrl: true },
  });

  let updated = 0;
  let alreadySet = 0;
  let noEntry = 0;

  for (const set of sets) {
    const logoUrl = POKEMON_SET_LOGOS[set.code];
    if (!logoUrl) {
      noEntry += 1;
      continue;
    }
    if (set.logoUrl) {
      alreadySet += 1;
      continue;
    }
    await db.set.update({ where: { id: set.id }, data: { logoUrl } });
    updated += 1;
  }

  console.log(`Updated: ${updated}`);
  console.log(`Already set (left alone): ${alreadySet}`);
  console.log(`No table entry for this code: ${noEntry}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
