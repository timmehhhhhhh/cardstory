/**
 * One-off cleanup: collapses casing-duplicate CatalogItem.rarity values
 * (e.g. "Double Rare" vs "Double rare", "Hyper Rare" vs "Hyper rare") onto a
 * single Title Case spelling per (gameId, rarity.toLowerCase()) cluster.
 *
 * `rarity` is a plain free-text string column (see prisma/schema.prisma) —
 * not a lookup table with an id to repoint or delete — so "merging two
 * rarity types" is just a bulk string UPDATE, and "deleting the duplicate
 * category" falls out automatically once no row carries the old string
 * (getDistinctRarities() just reads unique values off this column).
 *
 * Canonical form = Title Case (first letter of each word uppercased, rest
 * lowercased), computed per cluster rather than hand-listed, so this also
 * catches any casing-duplicate pair beyond the ones already known about.
 * Clustering is scoped per gameId since two different games could
 * coincidentally share a lowercase rarity string that shouldn't be merged
 * across games.
 *
 * Safe to re-run: each cluster's updateMany where-clauses only match rows
 * still on a non-canonical spelling, so a second run finds zero clusters.
 *
 * Run with: npx tsx scripts/merge-rarity-casing-duplicates.ts [--dry-run]
 *
 * After a real (non-dry-run) apply, bust the cached Explore rarity filter:
 *   curl -X POST https://<host>/api/admin/revalidate-facets \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
import { db } from "../src/lib/db";

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((word) =>
      word.length === 0 ? word : word[0].toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

interface Cluster {
  gameId: string;
  canonical: string;
  variants: { rarity: string; count: number }[];
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const rows = await db.catalogItem.groupBy({
    by: ["gameId", "rarity"],
    where: { NOT: [{ rarity: null }, { rarity: "" }] },
    _count: { _all: true },
  });

  const byKey = new Map<string, { gameId: string; rarity: string; count: number }[]>();
  for (const row of rows) {
    const rarity = row.rarity as string;
    const key = `${row.gameId}::${rarity.toLowerCase()}`;
    const list = byKey.get(key) ?? [];
    list.push({ gameId: row.gameId, rarity, count: row._count._all });
    byKey.set(key, list);
  }

  const clusters: Cluster[] = [];
  for (const list of byKey.values()) {
    if (list.length < 2) continue;
    const canonical = toTitleCase(list[0].rarity);
    clusters.push({
      gameId: list[0].gameId,
      canonical,
      variants: list.map(({ rarity, count }) => ({ rarity, count })),
    });
  }

  if (clusters.length === 0) {
    console.log("No casing-duplicate rarity clusters found.");
    await db.$disconnect();
    return;
  }

  console.log(`Found ${clusters.length} casing-duplicate rarity cluster(s):\n`);

  let totalRowsUpdated = 0;
  for (const cluster of clusters) {
    const variantSummary = cluster.variants
      .map((v) => `"${v.rarity}" (${v.count} row${v.count === 1 ? "" : "s"})`)
      .join(", ");
    console.log(`[${cluster.gameId}] ${variantSummary} -> "${cluster.canonical}"`);

    for (const variant of cluster.variants) {
      if (variant.rarity === cluster.canonical) continue;
      if (dryRun) {
        console.log(`  (dry-run) would update ${variant.count} row(s) from "${variant.rarity}"`);
        continue;
      }
      const result = await db.catalogItem.updateMany({
        where: { gameId: cluster.gameId, rarity: variant.rarity },
        data: { rarity: cluster.canonical },
      });
      totalRowsUpdated += result.count;
      console.log(`  updated ${result.count} row(s) from "${variant.rarity}"`);
    }
  }

  console.log(
    dryRun
      ? "\nDry run complete — no rows were changed."
      : `\nDone. ${totalRowsUpdated} row(s) updated across ${clusters.length} cluster(s).`
  );
  if (!dryRun) {
    console.log(
      "\nNow bust the cached Explore rarity filter:\n" +
        '  curl -X POST https://<host>/api/admin/revalidate-facets -H "Authorization: Bearer $CRON_SECRET"'
    );
  }

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
