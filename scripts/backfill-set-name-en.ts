/**
 * One-time backfill: writes Set.nameEn for every already-seeded non-English
 * Pokémon Set row from scripts/data/pokemon-set-translations.ts (hand-
 * curated, keyed by Set.code), falling back to the verified
 * scripts/data/set-logos/*.json crawler output (keyed by Set.id — each
 * entry's `nameEn` is the English gloss the source site titles the set with)
 * for codes the hand table has no entry for.
 *
 * The file list and the cross-source conflict rule live in
 * scripts/lib/crawled-set-sources.ts, shared with backfill-set-logo-url.ts.
 * nameEn merges "drop-on-conflict", NOT "first-wins": these are fan/tracker
 * sites' glosses rather than checked translations, so two sources giving
 * different English names for one set is a real disagreement, and a wrong
 * English set name is visible to every user of the app. A set with no name
 * is a visible gap someone can fix; a set with a confidently-wrong name is
 * not.
 *
 * Two trust levels, two clobber rules:
 *   - the hand-curated table MAY correct an existing Set.nameEn — that is
 *     what curating it is for;
 *   - a crawled gloss only ever fills a NULL, so re-running this can never
 *     overwrite a checked translation with a scraped one.
 *
 * Cheaper than a full `npm run seed:catalog` re-run (which re-pulls Pokémon's
 * entire multi-hundred-set history over the network — see seed-catalog.ts's
 * header comment) since this only needs the Set table, not a live provider
 * fetch. Going forward, new sets get `nameEn` directly from
 * mapTcgdexSet/seed-catalog.ts (see lib/games/pokemon/mapper.ts) — this
 * script only exists to catch up rows seeded before that wiring existed.
 *
 * Safe to re-run: every write is keyed by Set.id and only touches rows with
 * a usable source entry.
 *
 * Run with: npx tsx scripts/backfill-set-name-en.ts [--dry-run]
 */
import { db } from "@/lib/db";
import { parseSetLanguage } from "@/lib/content-gaps";
import { POKEMON_SET_TRANSLATIONS } from "./data/pokemon-set-translations";
import { loadCrawledSetField } from "./lib/crawled-set-sources";
import { hasFlag, runScript } from "./lib/cli";

async function main() {
  const dryRun = hasFlag("dry-run");
  const crawledNames = loadCrawledSetField("nameEn", "drop-on-conflict");

  const sets = await db.set.findMany({
    where: { gameId: "pokemon" },
    select: { id: true, code: true, name: true, nameEn: true },
  });

  let updated = 0;
  let alreadySet = 0;
  let noTranslation = 0;
  let crawledSkippedExisting = 0;

  for (const set of sets) {
    const curated = POKEMON_SET_TRANSLATIONS[set.code];
    const crawled = crawledNames.get(set.id);
    const translation = curated ?? crawled;

    if (!translation) {
      // English sets (code has no "<lang>:" prefix) and any non-English set
      // not yet in the table both land here.
      if (parseSetLanguage(set.code) !== null) noTranslation += 1;
      continue;
    }
    if (set.nameEn === translation) {
      alreadySet += 1;
      continue;
    }
    // A crawled gloss fills a gap; it never overwrites an existing name.
    if (curated === undefined && set.nameEn) {
      crawledSkippedExisting += 1;
      continue;
    }
    if (!dryRun) await db.set.update({ where: { id: set.id }, data: { nameEn: translation } });
    updated += 1;
  }

  const prefix = dryRun ? "[dry run] " : "";
  console.log(`${prefix}Updated: ${updated}`);
  console.log(`${prefix}Already up to date: ${alreadySet}`);
  console.log(`${prefix}Had a name already, crawled gloss not applied: ${crawledSkippedExisting}`);
  console.log(`${prefix}Non-English sets with no translation-table entry: ${noTranslation}`);
}

void runScript(main, () => db.$disconnect());
