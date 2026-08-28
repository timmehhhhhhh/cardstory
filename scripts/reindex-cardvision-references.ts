/**
 * Runs CardVision's reference-image indexer (src/lib/cardvision/
 * reference-index.ts) — downloads and caches each eligible CatalogItem's
 * reference image (imageLargeUrl preferred, imageSmallUrl fallback),
 * skipping anything already cached and unchanged. Safe to re-run
 * repeatedly: unchanged items are cache hits, not re-downloads.
 *
 * Run with:
 *   npx tsx scripts/reindex-cardvision-references.ts
 *   npx tsx scripts/reindex-cardvision-references.ts --game=pokemon
 *   npx tsx scripts/reindex-cardvision-references.ts --since=2026-08-01
 *
 * --game narrows to one game's catalog items. --since narrows to
 * CatalogItems synced on/after that date (ISO 8601), for indexing just a
 * recently-imported set rather than re-scanning the whole catalog.
 * Neither flag is required — with no flags this indexes every
 * CatalogItem in the catalog with an image URL, which for a large
 * catalog can take a while (this script is the CLI-driven full-backfill
 * path; see docs/cardvision.md for why this isn't run from a request
 * handler).
 */
import { catalogReferenceIndexer } from "@/lib/cardvision";
import { db } from "@/lib/db";

function parseArgs(argv: string[]): { gameId?: string; since?: Date } {
  const result: { gameId?: string; since?: Date } = {};
  for (const arg of argv) {
    if (arg.startsWith("--game=")) result.gameId = arg.slice("--game=".length);
    else if (arg.startsWith("--since=")) {
      const parsed = new Date(arg.slice("--since=".length));
      if (Number.isNaN(parsed.getTime())) {
        console.error(`Invalid --since date: ${arg}`);
        process.exit(1);
      }
      result.since = parsed;
    }
  }
  return result;
}

async function main() {
  const { gameId, since } = parseArgs(process.argv.slice(2));
  console.log(`Rebuilding CardVision reference index${gameId ? ` (game: ${gameId})` : ""}${since ? ` (since: ${since.toISOString()})` : ""}…\n`);

  const result = await catalogReferenceIndexer.rebuildIndex({ gameId, since });

  console.log("Reference index rebuild complete:");
  console.log(`  examined:      ${result.examined}`);
  console.log(`  eligible:      ${result.eligible}`);
  console.log(`  downloaded:    ${result.downloaded}`);
  console.log(`  cache hits:    ${result.cacheHit}`);
  console.log(`  skipped:       ${result.skipped}`);
  console.log(`  failed:        ${result.failed}`);
  console.log(`  invalid:       ${result.invalid}`);
  console.log(`  removed links: ${result.removedLinks}`);
  if (result.reason) console.log(`  reason: ${result.reason}`);

  const status = await catalogReferenceIndexer.getIndexStatus();
  console.log(`\nIndex status: ${status.indexedCount}/${status.indexableCount} catalog items indexed, last rebuild ${status.lastRebuildAt ?? "never"}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
