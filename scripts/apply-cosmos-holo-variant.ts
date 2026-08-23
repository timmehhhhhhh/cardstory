/**
 * Applies scripts/data/pokemon-cosmos-holo-matches.json (produced by
 * scripts/crawl-tcgcollector-cosmos-holo.ts) — flips each matched
 * CatalogItem's variantKey from "reverseHolofoil" to "cosmosHolo".
 *
 * Deliberately never touches `id`: CatalogItem.id was generated once at
 * seed time from the variant key that existed then (see seed-catalog.ts),
 * and every Holding/WatchlistEntry/DeckCard/PriceAlert row that references
 * these ids does so as a plain scalar (not a DB foreign key) — changing the
 * id would silently orphan them. variantKey itself is safe to change: a
 * catalogItem.upsert's `update` branch in seed-catalog.ts never touches
 * variantKey (only `create` does), so this is a permanent, reseed-safe
 * change, not something a future `npm run seed:catalog` can revert.
 *
 * Guards on the row's current variantKey (must still be "reverseHolofoil"),
 * so this is safe to re-run.
 *
 * Run with: npx tsx scripts/apply-cosmos-holo-variant.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "../src/lib/db";

const MATCHES_FILE = path.join(process.cwd(), "scripts", "data", "pokemon-cosmos-holo-matches.json");

interface MatchEntry {
  catalogItemId: string;
  sourceName: string;
  sourceSet: string;
  sourceNumber: string;
}
interface MatchesFile {
  verified: boolean;
  entries: MatchEntry[];
}

async function main() {
  const file: MatchesFile = JSON.parse(fs.readFileSync(MATCHES_FILE, "utf-8"));
  if (!file.verified) {
    console.error(`${MATCHES_FILE} is not verified: true — review it, then flip that flag before applying.`);
    process.exit(1);
  }

  console.log(`Applying ${file.entries.length} matched rows...`);
  let updated = 0;
  let alreadyDone = 0;
  let missing = 0;

  for (const entry of file.entries) {
    const result = await db.catalogItem.updateMany({
      where: { id: entry.catalogItemId, variantKey: "reverseHolofoil" },
      data: { variantKey: "cosmosHolo" },
    });
    if (result.count === 1) {
      updated += 1;
      continue;
    }
    // No row updated — either it's already cosmosHolo (re-run) or the id
    // vanished/changed underneath us since derive ran. Distinguish the two.
    const row = await db.catalogItem.findUnique({ where: { id: entry.catalogItemId }, select: { variantKey: true } });
    if (row?.variantKey === "cosmosHolo") alreadyDone += 1;
    else {
      missing += 1;
      console.warn(`  no match for ${entry.catalogItemId} (${entry.sourceName}, ${entry.sourceSet})`);
    }
  }

  console.log(`\nUpdated:      ${updated}`);
  console.log(`Already done: ${alreadyDone}`);
  console.log(`Missing:      ${missing}`);

  const total = await db.catalogItem.count({ where: { gameId: "pokemon", variantKey: "cosmosHolo" } });
  console.log(`\nTotal cosmosHolo rows in DB now: ${total}`);

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
