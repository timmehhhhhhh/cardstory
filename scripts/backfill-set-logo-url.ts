/**
 * One-time backfill: writes Set.logoUrl for every already-seeded non-English
 * Pokémon Set row from scripts/data/pokemon-set-logos.ts (hand-curated, keyed
 * by Set.code), falling back to the verified scripts/data/set-logos/*.json
 * crawler output (machine-generated, keyed by Set.id) for codes the hand
 * table has no entry for. The hand table wins on overlap since it's been
 * individually checked; the crawler files only fill gaps.
 *
 * The file list and the cross-source conflict rule live in
 * scripts/lib/crawled-set-sources.ts, shared with backfill-set-name-en.ts —
 * see there for why logoUrl merges "first-wins" while nameEn does not.
 *
 * Cheaper than a full `npm run seed:catalog` re-run (which re-pulls Pokémon's
 * entire multi-hundred-set history over the network — see seed-catalog.ts's
 * header comment) since this only needs the Set table, not a live provider
 * fetch. Going forward, new sets get `logoUrl` directly from
 * mapTcgdexSet/seed-catalog.ts (see lib/games/pokemon/mapper.ts) — this
 * script only exists to catch up rows seeded before that table had an entry
 * for their code. Mirrors scripts/backfill-set-name-en.ts.
 *
 * Safe to re-run: every write is keyed by Set.id, only touches rows with a
 * usable source entry, and skips rows that already have a logoUrl — so it
 * never clobbers a value set some other way. (Unlike nameEn, an existing
 * logoUrl is not "a translation that might be wrong", it is a URL that
 * already resolves to a logo, so there is nothing to correct.)
 *
 * Run with: npx tsx scripts/backfill-set-logo-url.ts [--dry-run]
 */
import { db } from "@/lib/db";
import { POKEMON_SET_LOGOS } from "./data/pokemon-set-logos";
import { loadCrawledSetField } from "./lib/crawled-set-sources";
import { hasFlag, runScript } from "./lib/cli";

async function main() {
  const dryRun = hasFlag("dry-run");
  const crawledLogos = loadCrawledSetField("logoUrl", "first-wins");

  const sets = await db.set.findMany({
    where: { gameId: "pokemon" },
    select: { id: true, code: true, logoUrl: true },
  });

  let updated = 0;
  let alreadySet = 0;
  let noEntry = 0;

  for (const set of sets) {
    const logoUrl = POKEMON_SET_LOGOS[set.code] ?? crawledLogos.get(set.id);
    if (!logoUrl) {
      noEntry += 1;
      continue;
    }
    if (set.logoUrl) {
      alreadySet += 1;
      continue;
    }
    if (!dryRun) await db.set.update({ where: { id: set.id }, data: { logoUrl } });
    updated += 1;
  }

  const prefix = dryRun ? "[dry run] " : "";
  console.log(`${prefix}Updated: ${updated}`);
  console.log(`${prefix}Already set (left alone): ${alreadySet}`);
  console.log(`${prefix}No source entry for this set: ${noEntry}`);
}

void runScript(main, () => db.$disconnect());
