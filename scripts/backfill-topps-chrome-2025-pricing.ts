/**
 * One-time pricing backfill for 2025-26 Topps Chrome Basketball's 299
 * non-refractor base cards (see scripts/seed-topps-chrome-2025.ts, which
 * seeds the checklist itself with images but "no prices are seeded").
 *
 * Scope is deliberately just the base tier, not the ~56 named refractor
 * parallels per card: neither SPORTSCARDSPRO_API_KEY nor
 * PRICECHARTING_API_KEY is configured for this project, and the README
 * itself notes that syncing a whole catalog isn't practical at the API's
 * 1 request/sec rate limit even when a key IS configured — so prices here
 * come from scripts/data/topps-chrome-2025/card-prices.ts, a hand-curated
 * snapshot (see that file's header for how/why), the same Browser-pane
 * sourcing method already used for card-images.ts.
 *
 * For each base card, applies its price via upsertSportsCardPriceSnapshot
 * — the same call the API-driven paths use (see
 * src/lib/pricing/sports-graded.ts) — with only loosePrice set (no graded
 * tiers available from this source). Deliberately does NOT set
 * priceChartingId: this is a manual snapshot, not an API match, so it
 * won't be picked up by the daily runSportsCardSnapshot refresh
 * (src/lib/pricing/run-sports-card-snapshot.ts only refreshes rows that
 * already have a priceChartingId). Re-run card-prices.ts's crawl and this
 * script periodically to keep prices current.
 *
 * Run with: npx tsx scripts/backfill-topps-chrome-2025-pricing.ts
 * Safe to re-run — upsertSportsCardPriceSnapshot is idempotent per item/day.
 */
import { PrismaClient } from "@prisma/client";
import { computeExternalKey } from "@/lib/sportscards/manage";
import { upsertSportsCardPriceSnapshot } from "@/lib/pricing/sports-snapshot";
import type { GradedPriceValues } from "@/lib/pricing/pricecharting/mapper";
import { BASE_SET } from "./data/topps-chrome-2025/base-set";
import { BASE_CARD_PRICES, CAPTURED_DATE } from "./data/topps-chrome-2025/card-prices";

const YEAR = 2025;
const DISTRIBUTOR = "Topps";
const SET_NAME = "Chrome";

async function main() {
  const db = new PrismaClient();

  let updated = 0;
  let missingRow = 0;
  let missingPrice = 0;

  for (const card of BASE_SET) {
    const price = BASE_CARD_PRICES[card.cardNumber];
    if (price == null) {
      console.warn(`No price for #${card.cardNumber} ${card.playerName} — skipping`);
      missingPrice++;
      continue;
    }

    // Base row only — no parallelName, matching how seed-topps-chrome-2025.ts
    // seeded it (parallels share every other field, so parallelName is the
    // only thing distinguishing this row from its ~56 refractor siblings).
    const externalKey = computeExternalKey({
      sport: "NBA",
      year: YEAR,
      distributor: DISTRIBUTOR,
      setName: SET_NAME,
      playerName: card.playerName,
      cardNumber: card.cardNumber,
      cardType: "base",
    });

    const item = await db.sportsCardItem.findUnique({ where: { externalKey } });
    if (!item) {
      console.warn(`No SportsCardItem found for #${card.cardNumber} ${card.playerName} — skipping`);
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
  }

  console.log(
    `Done. ${updated} priced, ${missingPrice} missing a source price, ${missingRow} missing a DB row (of ${BASE_SET.length} base cards).`
  );
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
