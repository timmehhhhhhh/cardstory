/**
 * Manual catalog backfill: upserts hand-curated CatalogItem/Set rows for
 * real Pokémon cards that have no bulk-API source — see
 * scripts/data/pokemon-manual/*.ts and lib/catalog/manual.ts.
 *
 * Unlike scripts/seed-catalog.ts (which pulls every card live from
 * tcgdex.net/pokemontcg.io every run), this data is hand-researched and
 * checked in as plain TS files. Safe to re-run — every row is upserted by
 * a deterministic id, and it never touches ids the live providers already
 * own (see the per-entry sourceNote for how that was confirmed). Entries
 * not yet verified against a primary/corroborating source are skipped
 * with a warning rather than seeded as a guess.
 *
 * Run with: npx tsx scripts/seed-pokemon-manual.ts
 */
import { db } from "@/lib/db";
import { upsertManualSet, upsertManualCatalogItem } from "@/lib/catalog/manual";
import { POKEMON_MANUAL_ENTRIES } from "./data/pokemon-manual/legend-secrets";
import { POKEMON_MANUAL_ENTRIES as GARURA_RULE_PROMOS } from "./data/pokemon-manual/garura-rule-promos";
import { POKEMON_MANUAL_ENTRIES as SV_P_KOREAN_PROMOS } from "./data/pokemon-manual/sv-p-korean-promos";
import { POKEMON_MANUAL_ENTRIES as MEGA_FESTA_KOREAN_PROMOS } from "./data/pokemon-manual/mega-festa-korean-promos";

// Add each new manual data file here as it's researched.
const ENTRY_FILES: { label: string; entries: typeof POKEMON_MANUAL_ENTRIES }[] = [
  { label: "legend-secrets", entries: POKEMON_MANUAL_ENTRIES },
  { label: "garura-rule-promos", entries: GARURA_RULE_PROMOS },
  { label: "sv-p-korean-promos", entries: SV_P_KOREAN_PROMOS },
  { label: "mega-festa-korean-promos", entries: MEGA_FESTA_KOREAN_PROMOS },
];

async function main() {
  let count = 0;
  let skipped = 0;

  for (const { label, entries } of ENTRY_FILES) {
    for (const entry of entries) {
      if (!entry.verified) {
        console.warn(`[${label}] skipping unverified stub: ${entry.name} (${entry.externalId}) — ${entry.sourceNote}`);
        skipped += 1;
        continue;
      }

      await upsertManualSet({
        setId: entry.set.setId,
        gameId: entry.set.gameId,
        name: entry.set.name,
        nameEn: entry.set.nameEn,
        code: entry.set.code,
        releaseDate: entry.set.releaseDate ? new Date(entry.set.releaseDate) : undefined,
        symbolUrl: entry.set.symbolUrl,
        cardCount: entry.set.cardCount,
      });

      const id = `${entry.set.gameId}:${entry.externalId}`;
      await upsertManualCatalogItem({
        id,
        gameId: entry.set.gameId,
        setId: entry.set.setId,
        externalId: entry.externalId,
        name: entry.name,
        nameEn: entry.nameEn,
        number: entry.number,
        rarity: entry.rarity,
        artist: entry.artist,
        cardType: entry.cardType,
        imageSmallUrl: entry.imageSmallUrl,
        imageLargeUrl: entry.imageLargeUrl,
        productType: entry.productType,
        language: entry.language,
      });

      console.log(`[${label}] upserted ${entry.name} (${id})`);
      count += 1;
    }
  }

  console.log(`\nDone. ${count} manual CatalogItem row(s) upserted, ${skipped} unverified stub(s) skipped.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
