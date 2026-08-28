/**
 * Runs CardVision's embedding generator (src/lib/cardvision/
 * embedding-index.ts) — embeds each cached reference image (via
 * catalogReferenceIndexer.getCachedReferenceImage, Phase 2's seam) using
 * the default (Voyage) VisionEmbeddingProvider and persists the result.
 * Safe to re-run repeatedly: an item already embedded by the current
 * provider is a cache hit, not regenerated. Requires VOYAGE_API_KEY —
 * without one, every item is skipped (see voyage-embedding-provider.ts's
 * "not configured" contract).
 *
 * Run with:
 *   npx tsx scripts/generate-cardvision-embeddings.ts
 *   npx tsx scripts/generate-cardvision-embeddings.ts --game=pokemon
 *   npx tsx scripts/generate-cardvision-embeddings.ts --since=2026-08-01
 *   npx tsx scripts/generate-cardvision-embeddings.ts --limit=100
 *
 * Flags mirror scripts/reindex-cardvision-references.ts's. Run
 * reindex-cardvision-references.ts first — this script only embeds items
 * Phase 2 has already downloaded and cached.
 */
import { createCardEmbeddingIndexer } from "@/lib/cardvision";
import { db } from "@/lib/db";

function parseArgs(argv: string[]): { gameId?: string; since?: Date; limit?: number } {
  const result: { gameId?: string; since?: Date; limit?: number } = {};
  for (const arg of argv) {
    if (arg.startsWith("--game=")) result.gameId = arg.slice("--game=".length);
    else if (arg.startsWith("--since=")) {
      const parsed = new Date(arg.slice("--since=".length));
      if (Number.isNaN(parsed.getTime())) {
        console.error(`Invalid --since date: ${arg}`);
        process.exit(1);
      }
      result.since = parsed;
    } else if (arg.startsWith("--limit=")) {
      const parsed = Number(arg.slice("--limit=".length));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        console.error(`Invalid --limit: ${arg}`);
        process.exit(1);
      }
      result.limit = parsed;
    }
  }
  return result;
}

async function main() {
  const { gameId, since, limit } = parseArgs(process.argv.slice(2));
  console.log(
    `Generating CardVision embeddings${gameId ? ` (game: ${gameId})` : ""}${since ? ` (since: ${since.toISOString()})` : ""}${limit ? ` (limit: ${limit})` : ""}…\n`
  );

  const indexer = createCardEmbeddingIndexer();
  const result = await indexer.generateEmbeddings({ gameId, since, limit });

  console.log("Embedding generation complete:");
  console.log(`  examined:  ${result.examined}`);
  console.log(`  eligible:  ${result.eligible}`);
  console.log(`  generated: ${result.generated}`);
  console.log(`  cache hits: ${result.cacheHit}`);
  console.log(`  skipped:   ${result.skipped}`);
  console.log(`  failed:    ${result.failed}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
