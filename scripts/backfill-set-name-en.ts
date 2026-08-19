/**
 * One-time backfill: writes Set.nameEn for every already-seeded non-English
 * Pokémon Set row from scripts/data/pokemon-set-translations.ts. Cheaper
 * than a full `npm run seed:catalog` re-run (which re-pulls Pokémon's
 * entire multi-hundred-set history over the network — see seed-catalog.ts's
 * header comment) since this only needs the Set table, not a live provider
 * fetch. Going forward, new sets get `nameEn` directly from
 * mapTcgdexSet/seed-catalog.ts (see lib/games/pokemon/mapper.ts) — this
 * script only exists to catch up rows seeded before that wiring existed.
 *
 * Safe to re-run: every write is keyed by Set.id and only touches rows
 * whose code has a translation-table entry.
 *
 * Run with: npx tsx scripts/backfill-set-name-en.ts
 */
import { db } from "@/lib/db";
import { POKEMON_SET_TRANSLATIONS } from "./data/pokemon-set-translations";

async function main() {
  const sets = await db.set.findMany({
    where: { gameId: "pokemon" },
    select: { id: true, code: true, name: true, nameEn: true },
  });

  let updated = 0;
  let alreadySet = 0;
  let noTranslation = 0;

  for (const set of sets) {
    const translation = POKEMON_SET_TRANSLATIONS[set.code];
    if (!translation) {
      // English pokemontcg.io sets (code has no "<lang>:" prefix) and any
      // non-English set not yet in the table both land here.
      if (/^(ja|zh-cn|zh-tw|ko):/.test(set.code)) noTranslation += 1;
      continue;
    }
    if (set.nameEn === translation) {
      alreadySet += 1;
      continue;
    }
    await db.set.update({ where: { id: set.id }, data: { nameEn: translation } });
    updated += 1;
  }

  console.log(`Updated: ${updated}`);
  console.log(`Already up to date: ${alreadySet}`);
  console.log(`Non-English sets with no translation-table entry: ${noTranslation}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
