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
 * Concurrency + resilience: a first straight-serial run against production
 * (Neon, real network latency vs. local Postgres) died partway through —
 * upsertSportsCardPriceSnapshot's $transaction defaults to Prisma's 5s
 * interactive-transaction timeout, which one row blew past (110s, almost
 * certainly a connection-pool queuing stall) and the script had no
 * per-row error handling, so it crashed instead of continuing. Fixed here
 * with a longer transactionOptions timeout on this script's own
 * PrismaClient instance (local only — doesn't touch sports-snapshot.ts's
 * shared default, which every live request path also uses and shouldn't
 * have its timeout changed for this one bulk job's sake), a small bounded
 * worker pool (each row's snapshot is independent — different
 * sportsCardItemId, and CAPTURED_DATE is fixed, so nothing here depends on
 * processing order) instead of one giant serial await loop, and a
 * try/once-retry/log-and-continue per row so a single flaky row can't take
 * down an hour-long run.
 *
 * Run with: npx tsx scripts/backfill-topps-chrome-2025-parallel-pricing.ts
 * Safe to re-run — upsertSportsCardPriceSnapshot is idempotent per item/day.
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
const CONCURRENCY = 8;

interface Task {
  cardNumber: string;
  playerName: string;
  parallelName: string;
  price: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processOne(db: PrismaClient, task: Task): Promise<"updated" | "missingRow"> {
  const externalKey = computeExternalKey({
    sport: "NBA",
    year: YEAR,
    distributor: DISTRIBUTOR,
    setName: SET_NAME,
    playerName: task.playerName,
    cardNumber: task.cardNumber,
    parallelName: task.parallelName,
    cardType: "base",
  });

  const item = await db.sportsCardItem.findUnique({ where: { externalKey } });
  if (!item) return "missingRow";

  const values: GradedPriceValues = {
    loosePrice: task.price,
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
  return "updated";
}

async function main() {
  const db = new PrismaClient({ transactionOptions: { timeout: 20_000, maxWait: 15_000 } });
  const playerNameByCardNumber = new Map(BASE_SET.map((c) => [c.cardNumber, c.playerName]));

  const prices = parallelPrices as Record<string, Record<string, number>>;

  const tasks: Task[] = [];
  let skippedUnknownCard = 0;
  for (const [cardNumber, entry] of Object.entries(prices)) {
    const playerName = playerNameByCardNumber.get(cardNumber);
    if (!playerName) {
      skippedUnknownCard += Object.keys(entry).length;
      continue;
    }
    for (const [parallelName, price] of Object.entries(entry)) {
      tasks.push({ cardNumber, playerName, parallelName, price });
    }
  }

  let updated = 0;
  let missingRow = 0;
  let failed = 0;
  let processed = 0;
  const failures: { cardNumber: string; parallelName: string; error: string }[] = [];
  const startedAt = Date.now();

  let nextIndex = 0;
  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= tasks.length) return;
      const task = tasks[i];

      let result: "updated" | "missingRow" | null = null;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 2 && result === null; attempt++) {
        try {
          result = await processOne(db, task);
        } catch (err) {
          lastError = err;
          if (attempt === 0) await sleep(500); // one retry after a short backoff
        }
      }

      processed++;
      if (result === "updated") updated++;
      else if (result === "missingRow") missingRow++;
      else {
        failed++;
        failures.push({
          cardNumber: task.cardNumber,
          parallelName: task.parallelName,
          error: lastError instanceof Error ? lastError.message : String(lastError),
        });
      }

      if (processed % 500 === 0 || processed === tasks.length) {
        const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
        console.log(`${processed}/${tasks.length} processed (${updated} updated, ${failed} failed) — ${elapsedSec}s elapsed`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(
    `Done. ${updated} priced, ${missingRow} unmatched parallel name, ${skippedUnknownCard} unknown card number, ${failed} failed after retry (of ${tasks.length + skippedUnknownCard} scraped entries).`
  );
  if (failures.length) {
    console.log("Failed rows (re-run this script to retry them — it's idempotent):");
    for (const f of failures) console.log(`  #${f.cardNumber} [${f.parallelName}]: ${f.error}`);
  }
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
