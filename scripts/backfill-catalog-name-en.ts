/**
 * One-time backfill: writes CatalogItem.nameEn for every already-seeded
 * non-English Pokémon card, resolved from its printed localized name by
 * lib/games/pokemon/card-name-en.ts. The card-level sibling of
 * scripts/backfill-set-name-en.ts, and cheaper than a full
 * `npm run seed:catalog` re-run (which re-pulls Pokémon's entire
 * multi-hundred-set history over the network) since it needs no provider
 * fetch at all — the species table and translation overrides are both
 * checked in. Going forward, new cards get `nameEn` directly from
 * mapTcgdexCardVariants/seed-catalog.ts.
 *
 * Safe to re-run: every write is keyed by CatalogItem.id and only fires
 * when the resolved name differs from what's already stored.
 *
 * Also writes scripts/data/pokemon-card-translations.review.json — every
 * name the resolver could NOT translate, ranked by how many rows it covers.
 * That file is the worklist for growing POKEMON_CARD_TRANSLATIONS (Trainer/
 * Item/Stadium cards have no species to resolve from); the loop is: run
 * this, curate the top of the review file, run it again.
 *
 * Run with: npx tsx scripts/backfill-catalog-name-en.ts [--dry-run]
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { resolvePokemonCardNameEn } from "@/lib/games/pokemon/card-name-en";

const REVIEW_PATH = path.join(process.cwd(), "scripts/data/pokemon-card-translations.review.json");

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const items = await db.catalogItem.findMany({
    where: { gameId: "pokemon", language: { not: "EN" } },
    select: { id: true, name: true, nameEn: true, language: true },
  });

  let updated = 0;
  let alreadySet = 0;
  const unresolved = new Map<string, { language: string; name: string; rowCount: number }>();

  for (const item of items) {
    const resolved = resolvePokemonCardNameEn(item.name, item.language);
    if (!resolved) {
      // Keep any hand-curated value already on the row (e.g. the LEGEND-era
      // secrets seeded by scripts/seed-pokemon-manual.ts) — an unresolved
      // name means "the rules can't derive this", not "this row is wrong".
      if (item.nameEn) {
        alreadySet += 1;
        continue;
      }
      const key = `${item.language}:${item.name}`;
      const entry = unresolved.get(key) ?? { language: item.language, name: item.name, rowCount: 0 };
      entry.rowCount += 1;
      unresolved.set(key, entry);
      continue;
    }

    if (item.nameEn === resolved) {
      alreadySet += 1;
      continue;
    }
    if (!dryRun) await db.catalogItem.update({ where: { id: item.id }, data: { nameEn: resolved } });
    updated += 1;
  }

  const entries = [...unresolved.values()].sort(
    (a, b) => b.rowCount - a.rowCount || a.language.localeCompare(b.language) || a.name.localeCompare(b.name)
  );
  const unresolvedRows = entries.reduce((sum, e) => sum + e.rowCount, 0);

  if (!dryRun) {
    await writeFile(
      REVIEW_PATH,
      `${JSON.stringify(
        {
          gameId: "pokemon",
          note:
            "Non-English card names the resolver could not translate, ranked by row count. " +
            "Add entries to POKEMON_CARD_TRANSLATIONS in scripts/data/pokemon-card-translations.ts " +
            "and re-run scripts/backfill-catalog-name-en.ts.",
          generatedAt: new Date().toISOString(),
          entries,
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }

  const resolvedRows = items.length - unresolvedRows;
  console.log(`${dryRun ? "[dry run] " : ""}Non-English cards: ${items.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Already up to date: ${alreadySet}`);
  console.log(
    `Resolved: ${resolvedRows} (${((resolvedRows / items.length) * 100).toFixed(1)}%) — ` +
      `unresolved ${unresolvedRows} rows across ${entries.length} distinct names`
  );
  if (!dryRun) console.log(`Review file: ${REVIEW_PATH}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
