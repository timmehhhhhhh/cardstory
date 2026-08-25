/**
 * 2025-26 Topps Chrome Basketball checklist seed: upserts every base card
 * (#1-300, #226 not released) plus its full named-parallel list as
 * SportsCardItem rows — see src/lib/sportscards/manage.ts for the "one row
 * per parallel, upserted by a deterministic externalKey" model this shares
 * with scripts/seed-lamelo-ball.ts.
 *
 * Unlike LaMelo Ball's checklist (organized per-player, spanning many
 * product lines), this is organized per-set — one product, so every row
 * shares the same year/distributor/setName/releaseDate, and the named
 * parallel list (scripts/data/topps-chrome-2025/parallels.ts) is identical
 * across every base card except the conditional Image Variation tier (see
 * BaseCardEntry.hasImageVariation in scripts/data/topps-chrome-2025/types.ts).
 *
 * No imageUrl is seeded yet (see base-set.ts's header comment) — every row
 * is created price-less and image-less, to be backfilled later, same as
 * LaMelo Ball's initial seed.
 *
 * Run with: npx tsx scripts/seed-topps-chrome-2025.ts
 * Re-run any time — everything here is an upsert keyed by externalKey, so
 * it's safe to repeat after editing base-set.ts or parallels.ts.
 */
import { PrismaClient } from "@prisma/client";
import { upsertChecklistSportsCardItem, computeExternalKey } from "@/lib/sportscards/manage";
import { BASE_SET } from "./data/topps-chrome-2025/base-set";
import { BASE_PARALLELS, IMAGE_VARIATION_PARALLELS } from "./data/topps-chrome-2025/parallels";

const YEAR = 2025;
const DISTRIBUTOR = "Topps";
const SET_NAME = "Chrome";
// tcdb.com/ViewSet.cfm/sid/574514/2025-26-Topps-Chrome — "Release Date: December 18, 2025"
const RELEASE_DATE = new Date("2025-12-18T00:00:00.000Z");

async function main() {
  const db = new PrismaClient();
  let total = 0;
  const seenKeys = new Set<string>();

  for (const card of BASE_SET) {
    const base = {
      sport: "NBA" as const,
      year: YEAR,
      distributor: DISTRIBUTOR,
      setName: SET_NAME,
      playerName: card.playerName,
      teamName: card.teamName,
      cardNumber: card.cardNumber,
      cardType: "base" as const,
      releaseDate: RELEASE_DATE,
    };

    // Catch accidental duplicate card numbers in base-set.ts before they
    // silently collapse into one upserted row.
    const baseKey = computeExternalKey(base);
    if (seenKeys.has(baseKey)) {
      console.warn(`Duplicate card number, skipping: #${card.cardNumber} ${card.playerName}`);
      continue;
    }
    seenKeys.add(baseKey);

    await upsertChecklistSportsCardItem(base);
    total++;

    const parallels = card.hasImageVariation ? [...BASE_PARALLELS, ...IMAGE_VARIATION_PARALLELS] : BASE_PARALLELS;
    for (const parallel of parallels) {
      await upsertChecklistSportsCardItem({
        ...base,
        parallelName: parallel.name,
        serialLimit: parallel.serialLimit,
        // No per-parallel scan exists — every parallel shares the base
        // card's photo (once one is added) until a real scan replaces it.
        imageIsInherited: true,
      });
      total++;
    }
  }

  console.log(`Done. ${total} SportsCardItem rows upserted across ${BASE_SET.length} base cards.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
