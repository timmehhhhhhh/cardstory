/**
 * Read-only report of catalog content gaps for Pokémon and Riftbound: cards
 * missing an image, cards missing an English name (nameEn) on a non-English
 * row, and sets missing a logo or an English name — plus a `sports` section
 * covering the same "missing image"/"missing logo" gaps for non-parallel
 * SportsCardItem rows, grouped by sport/year/distributor/set. Never writes
 * anything to the DB — this exists purely to answer "what's actually
 * missing right now" before pointing a crawler/backfill job at it, since the
 * various *.review.json files under scripts/data/ reflect the last time a
 * crawler ran, not the live DB.
 *
 * Prints a ranked summary (which sets have the most gaps, so effort goes
 * where it matters) and writes the full row lists to
 * scripts/data/missing-content-report.json for use as crawler input.
 *
 * The queries themselves live in src/lib/content-gaps.ts so the crawlers and
 * the cron jobs can ask the same questions this report asks; this file is
 * just the CLI and the human-readable rendering of them.
 *
 * Run with: npx tsx scripts/report-missing-content.ts [gameId]
 * (needs a real DATABASE_URL — run against local dev or prod, not this
 * worktree's unconfigured env). The `sports` section always runs regardless
 * of `gameId` — that arg only scopes the TCG catalog section, which is what
 * it always meant.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "@/lib/db";
import {
  collectSetGaps,
  collectSportsGaps,
  type SetGapSummary,
  type SportsGroupGapSummary,
} from "@/lib/content-gaps";
import { runScript } from "./lib/cli";

const OUT_PATH = path.join(process.cwd(), "scripts", "data", "missing-content-report.json");
const GAMES = ["pokemon", "riftbound"] as const;

async function main() {
  const gameFilter = process.argv[2];
  const games = gameFilter ? GAMES.filter((g) => g === gameFilter) : GAMES;
  if (gameFilter && games.length === 0) {
    console.error(`Unknown gameId "${gameFilter}" — expected one of: ${GAMES.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const report: Record<string, SetGapSummary[] | SportsGroupGapSummary[]> = {};

  for (const gameId of games) {
    console.log(`\n=== ${gameId} ===`);
    const { gaps, totalSets } = await collectSetGaps(gameId);
    report[gameId] = gaps;

    const totalMissingImages = gaps.reduce((sum, s) => sum + s.missingImages, 0);
    const totalMissingNameEn = gaps.reduce((sum, s) => sum + s.missingNameEn, 0);
    const setsWithNoLogo = gaps.filter((s) => s.setLogoMissing).length;
    const setsWithNoNameEn = gaps.filter((s) => s.setNameEnMissing).length;

    console.log(`Sets with any gap: ${gaps.length} / ${totalSets}`);
    console.log(`Total cards missing image: ${totalMissingImages}`);
    console.log(`Total non-EN cards missing nameEn: ${totalMissingNameEn}`);
    console.log(`Sets missing logoUrl: ${setsWithNoLogo}`);
    console.log(`Non-EN sets missing nameEn: ${setsWithNoNameEn}`);

    console.log(`\nTop 10 sets by card gaps:`);
    for (const s of gaps.slice(0, 10)) {
      console.log(
        `  ${s.setId} (${s.setName}, ${s.language}) — images: ${s.missingImages}/${s.totalCards}, nameEn: ${s.missingNameEn}/${s.totalCards}, logo missing: ${s.setLogoMissing}, set nameEn missing: ${s.setNameEnMissing}`
      );
    }
  }

  console.log(`\n=== sports ===`);
  const sports = await collectSportsGaps();
  report.sports = sports.gaps;

  const sportsMissingImages = sports.gaps.reduce((sum, s) => sum + s.missingImages, 0);
  const groupsMissingLogo = sports.gaps.filter((s) => s.missingSetLogo).length;
  console.log(`Non-parallel cards: ${sports.totalNonParallelCards}`);
  console.log(`Product lines with any gap: ${sports.gaps.length}`);
  console.log(`Total non-parallel cards missing image: ${sportsMissingImages}`);
  console.log(`Product lines missing setLogoUrl: ${groupsMissingLogo}`);
  console.log(`\nTop 10 product lines by missing images:`);
  for (const s of sports.gaps.slice(0, 10)) {
    console.log(
      `  ${s.sport} ${s.year ?? "?"} ${s.distributor ?? "?"} ${s.setName} — images: ${s.missingImages}/${s.totalNonParallelCards}, logo missing: ${s.missingSetLogo}`
    );
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nFull report written to ${path.relative(process.cwd(), OUT_PATH)}`);
}

void runScript(main, () => db.$disconnect());
