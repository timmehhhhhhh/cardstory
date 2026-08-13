/**
 * Manually triggers the same daily price-snapshot logic the Vercel Cron job
 * runs, without going over HTTP — handy for local dev/testing.
 *
 * Run with: npx tsx scripts/run-snapshot.ts
 */
import { runDailySnapshot } from "@/lib/pricing/run-daily-snapshot";
import { db } from "@/lib/db";

async function main() {
  console.log("Running daily price snapshot…\n");
  const results = await runDailySnapshot();
  for (const r of results) {
    console.log(`[${r.gameId}] sets: ${r.setsProcessed}, items priced: ${r.itemsPriced}`);
    if (r.errors.length) console.warn(`[${r.gameId}] errors:`, r.errors);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
