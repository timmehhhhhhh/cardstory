/**
 * Manually triggers the same daily price-snapshot logic the Vercel Cron job
 * runs, without going over HTTP — handy for local dev/testing.
 *
 * Run with: npx tsx scripts/run-snapshot.ts
 */
import { runDailySnapshot } from "@/lib/pricing/run-daily-snapshot";
import { runSportsCardSnapshot } from "@/lib/pricing/run-sports-card-snapshot";
import { db } from "@/lib/db";

async function main() {
  console.log("Running daily price snapshot…\n");
  const results = await runDailySnapshot();
  for (const r of results) {
    console.log(`[${r.gameId}] sets: ${r.setsProcessed}, items priced: ${r.itemsPriced}`);
    if (r.errors.length) console.warn(`[${r.gameId}] errors:`, r.errors);
  }

  const sportsCards = await runSportsCardSnapshot();
  if (!sportsCards.configured) {
    console.log("[sports cards] skipped — no SPORTSCARDSPRO_API_KEY/PRICECHARTING_API_KEY configured");
  } else {
    console.log(
      `[sports cards] processed: ${sportsCards.itemsProcessed}, priced: ${sportsCards.itemsPriced}`
    );
    if (sportsCards.errors.length) console.warn("[sports cards] errors:", sportsCards.errors);
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
