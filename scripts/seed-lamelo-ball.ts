/**
 * LaMelo Ball checklist seed: upserts a hand-curated, season-by-season
 * checklist of his base/insert/short-print cards (scripts/data/lamelo-ball/
 * <season>.ts) plus every documented parallel of each, as SportsCardItem
 * rows tagged with cardType — see src/lib/sportscards/manage.ts for the
 * "one row per parallel, upserted by a deterministic externalKey" model.
 *
 * Unlike scripts/seed-catalog.ts (which pulls TCG data live from a free
 * API every run), there is no equivalent bulk API for sports cards, so
 * this data is hand-researched and checked in as plain TS files.
 *
 * Run with: npx tsx scripts/seed-lamelo-ball.ts
 * Re-run any time — everything here is an upsert keyed by externalKey, so
 * it's safe to repeat, and adding a new season file just requires adding
 * it to SEASON_FILES below.
 */
import { PrismaClient } from "@prisma/client";
import { upsertChecklistSportsCardItem, computeExternalKey } from "@/lib/sportscards/manage";
import type { LameloCardEntry } from "./data/lamelo-ball/types";
import { SEASON_2020_21 } from "./data/lamelo-ball/2020-21";
import { SEASON_2021_22 } from "./data/lamelo-ball/2021-22";
import { SEASON_2022_23 } from "./data/lamelo-ball/2022-23";
import { lookupReleaseDate } from "./data/lamelo-ball/release-dates";

const PLAYER_NAME = "LaMelo Ball";
const TEAM_NAME = "Charlotte Hornets";

// Add each new season file here as it's researched.
const SEASON_FILES: { season: string; entries: LameloCardEntry[] }[] = [
  { season: "2020-21", entries: SEASON_2020_21 },
  { season: "2021-22", entries: SEASON_2021_22 },
  { season: "2022-23", entries: SEASON_2022_23 },
];

async function seedEntry(db: PrismaClient, entry: LameloCardEntry) {
  const releaseDate = lookupReleaseDate(entry.year, entry.distributor, entry.setName);
  if (!releaseDate) {
    throw new Error(
      `Missing release date for ${entry.year} ${entry.distributor} ${entry.setName} — add it to scripts/data/lamelo-ball/release-dates.ts`
    );
  }

  const base = {
    sport: "NBA" as const,
    year: entry.year,
    distributor: entry.distributor,
    setName: entry.setName,
    playerName: PLAYER_NAME,
    teamName: entry.teamName ?? TEAM_NAME,
    cardNumber: entry.cardNumber,
    isAutograph: entry.isAutograph,
    isRelic: entry.isRelic,
    cardType: entry.cardType,
    releaseDate,
  };

  let count = 0;

  // The base/unparalleled version carries the verified image + source, and
  // its own print run if it's inherently short-printed with no named
  // parallel tiers (e.g. a Chronicles sub-brand numbered to /8 on its own).
  await upsertChecklistSportsCardItem({
    ...base,
    imageUrl: entry.imageUrl,
    imageBackUrl: entry.imageBackUrl,
    sourceUrl: entry.sourceUrl,
    serialLimit: entry.serialLimit,
  });
  count++;

  for (const parallel of entry.parallels ?? []) {
    await upsertChecklistSportsCardItem({
      ...base,
      parallelName: parallel.name,
      serialLimit: parallel.serialLimit,
    });
    count++;
  }

  return count;
}

async function main() {
  const db = new PrismaClient();
  let total = 0;
  const seenKeys = new Set<string>();

  for (const { season, entries } of SEASON_FILES) {
    let seasonCount = 0;
    for (const entry of entries) {
      // Catch accidental duplicate entries within/across data files before
      // they silently collapse into one upserted row.
      const baseKey = computeExternalKey({
        sport: "NBA",
        year: entry.year,
        distributor: entry.distributor,
        setName: entry.setName,
        playerName: PLAYER_NAME,
        cardNumber: entry.cardNumber,
        cardType: entry.cardType,
      });
      if (seenKeys.has(baseKey)) {
        console.warn(`[${season}] duplicate entry, skipping: ${entry.year} ${entry.distributor} ${entry.setName} #${entry.cardNumber}`);
        continue;
      }
      seenKeys.add(baseKey);
      seasonCount += await seedEntry(db, entry);
    }
    console.log(`[${season}] upserted ${seasonCount} rows (${entries.length} cards + parallels).`);
    total += seasonCount;
  }

  console.log(`\nDone. ${total} SportsCardItem rows upserted across ${SEASON_FILES.length} season(s).`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
