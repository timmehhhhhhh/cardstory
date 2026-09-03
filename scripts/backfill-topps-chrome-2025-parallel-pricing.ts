/**
 * One-time pricing backfill for 2025-26 Topps Chrome Basketball's named
 * refractor parallels (companion to
 * scripts/backfill-topps-chrome-2025-pricing.ts, which does the same for
 * the 299 non-refractor base cards — read that file's header first, same
 * "why hand-curated" reasoning applies here).
 *
 * Source: scripts/data/topps-chrome-2025/parallel-prices.json, a
 * cardNumber -> parallelName -> ungraded price map crawled via the Browser
 * pane from sportscardspro.com's own "Checklist by #" table
 * (?sort=model-number), same technique as card-prices.ts but keeping the
 * *bracketed* rows this time (e.g. "Pascal Siakam [Refractor] #1") instead
 * of discarding them. Captured 2026-09-04: 299 cards, 15,461 priced
 * parallel rows (of a possible ~17,094 — the rest had no ungraded sales
 * data on the source site, e.g. thinly-traded 1-of-1 tiers, and are simply
 * absent from the JSON rather than recorded as null).
 *
 * Every (cardNumber, parallelName) pair is looked up by externalKey and
 * applied if a matching SportsCardItem row exists; 15 of the 15,461
 * scraped names didn't match anything in parallels.ts (e.g. "Hyper
 * Refractor", "Xfractor" — parallels this checklist doesn't track) and are
 * silently skipped, logged in the missing-row count.
 *
 * Same caveats as the base-card backfill: only loosePrice is set (no
 * graded tiers from this source), priceChartingId is deliberately left
 * untouched so this is a point-in-time snapshot rather than a live feed,
 * and it's not picked up by the daily runSportsCardSnapshot refresh.
 *
 * Run with: npx tsx scripts/backfill-topps-chrome-2025-parallel-pricing.ts
 * Safe to re-run — upsertSportsCardPriceSnapshot is idempotent per item/day.
 * ~15,500 sequential DB transactions — expect several minutes to run.
 */
import { PrismaClient } from "@prisma/client";
import { computeExternalKey } from "@/lib/sportscards/manage";
import { upsertSportsCardPriceSnapshot } from "@/lib/pricing/sports-snapshot";
import type { GradedPriceValues } from "@/lib/pricing/pricecharting/mapper";
import { BASE_SET } from "./data/topps-chrome-2025/base-set";
import { CAPTURED_DATE } from "./data/topps-chrome-2025/card-prices";
import parallelPrices from "./data/topps-chrome-2025/parallel-prices.json";

const YEAR = 2025;
const DISTRIBUTOR = "Topps";
const SET_NAME = "Chrome";

async function main() {
  const db = new PrismaClient();
  const playerNameByCardNumber = new Map(BASE_SET.map((c) => [c.cardNumber, c.playerName]));

  let updated = 0;
  let missingRow = 0;
  let skippedUnknownCard = 0;
  let processed = 0;
  const startedAt = Date.now();

  const prices = parallelPrices as Record<string, Record<string, number>>;
  const totalEntries = Object.values(prices).reduce((sum, entry) => sum + Object.keys(entry).length, 0);

  for (const [cardNumber, entry] of Object.entries(prices)) {
    const playerName = playerNameByCardNumber.get(cardNumber);
    if (!playerName) {
      skippedUnknownCard += Object.keys(entry).length;
      continue;
    }

    for (const [parallelName, price] of Object.entries(entry)) {
      processed++;

      const externalKey = computeExternalKey({
        sport: "NBA",
        year: YEAR,
        distributor: DISTRIBUTOR,
        setName: SET_NAME,
        playerName,
        cardNumber,
        parallelName,
        cardType: "base",
      });

      const item = await db.sportsCardItem.findUnique({ where: { externalKey } });
      if (!item) {
        missingRow++;
        continue;
      }

      const values: GradedPriceValues = {
        loosePrice: price,
        grade7Price: null,
        grade8Price: null,
        grade9Price: null,
        grade95Price: null,
        psa10Price: null,
        cgc10Price: null,
        sgc10Price: null,
        bgs10Price: null,
      };

      await upsertSportsCardPriceSnapshot(db, item.id, values, CAPTURED_DATE);
      updated++;

      if (processed % 1000 === 0) {
        const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
        console.log(`${processed}/${totalEntries} processed (${updated} updated) — ${elapsedSec}s elapsed`);
      }
    }
  }

  console.log(
    `Done. ${updated} priced, ${missingRow} unmatched parallel name, ${skippedUnknownCard} unknown card number (of ${totalEntries} scraped entries).`
  );
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
