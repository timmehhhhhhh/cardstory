/**
 * Read-only report of catalog content gaps for Pokémon and Riftbound: cards
 * missing an image, cards missing an English name (nameEn) on a non-English
 * row, and sets missing a logo or an English name. Never writes anything —
 * this exists purely to answer "what's actually missing right now" before
 * pointing a crawler/backfill script at it, since the various *.review.json
 * files under scripts/data/ reflect the last time a crawler ran, not the
 * live DB.
 *
 * Prints a ranked summary (which sets have the most gaps, so effort goes
 * where it matters) and writes the full row lists to
 * scripts/data/missing-content-report.json for use as crawler input.
 *
 * Run with: npx tsx scripts/report-missing-content.ts [gameId]
 * (needs a real DATABASE_URL — run against local dev or prod, not this
 * worktree's unconfigured env)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "@/lib/db";

const OUT_PATH = path.join(process.cwd(), "scripts", "data", "missing-content-report.json");
const GAMES = ["pokemon", "riftbound"] as const;

interface SetGapSummary {
  setId: string;
  setName: string;
  language: string;
  missingImages: number;
  missingNameEn: number;
  totalCards: number;
  setLogoMissing: boolean;
  setNameEnMissing: boolean;
}

async function main() {
  const gameFilter = process.argv[2];
  const games = gameFilter ? GAMES.filter((g) => g === gameFilter) : GAMES;
  if (games.length === 0) {
    console.error(`Unknown gameId "${gameFilter}" — expected one of: ${GAMES.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const report: Record<string, SetGapSummary[]> = {};

  for (const gameId of games) {
    console.log(`\n=== ${gameId} ===`);

    const sets = await db.set.findMany({
      where: { gameId },
      select: { id: true, name: true, code: true, logoUrl: true, nameEn: true },
    });
    const setById = new Map(sets.map((s) => [s.id, s]));

    const items = await db.catalogItem.findMany({
      where: { gameId },
      select: {
        setId: true,
        language: true,
        imageSmallUrl: true,
        imageLargeUrl: true,
        nameEn: true,
      },
    });

    const bySet = new Map<string, { missingImages: number; missingNameEn: number; total: number; language: string }>();
    for (const item of items) {
      const key = item.setId;
      const entry = bySet.get(key) ?? { missingImages: 0, missingNameEn: 0, total: 0, language: item.language };
      entry.total += 1;
      if (!item.imageSmallUrl && !item.imageLargeUrl) entry.missingImages += 1;
      if (item.language !== "EN" && !item.nameEn) entry.missingNameEn += 1;
      bySet.set(key, entry);
    }

    const summaries: SetGapSummary[] = [];
    for (const set of sets) {
      const cardGaps = bySet.get(set.id);
      const setNameEnMissing = set.name !== set.nameEn && !set.nameEn && /^[a-z]{2}(-[a-z]{2})?:/.test(set.code);
      const summary: SetGapSummary = {
        setId: set.id,
        setName: set.name,
        language: cardGaps?.language ?? "EN",
        missingImages: cardGaps?.missingImages ?? 0,
        missingNameEn: cardGaps?.missingNameEn ?? 0,
        totalCards: cardGaps?.total ?? 0,
        setLogoMissing: !set.logoUrl,
        setNameEnMissing,
      };
      if (
        summary.missingImages > 0 ||
        summary.missingNameEn > 0 ||
        summary.setLogoMissing ||
        summary.setNameEnMissing
      ) {
        summaries.push(summary);
      }
    }

    summaries.sort((a, b) => b.missingImages + b.missingNameEn - (a.missingImages + a.missingNameEn));
    report[gameId] = summaries;

    const totalMissingImages = summaries.reduce((sum, s) => sum + s.missingImages, 0);
    const totalMissingNameEn = summaries.reduce((sum, s) => sum + s.missingNameEn, 0);
    const setsWithNoLogo = summaries.filter((s) => s.setLogoMissing).length;
    const setsWithNoNameEn = summaries.filter((s) => s.setNameEnMissing).length;

    console.log(`Sets with any gap: ${summaries.length} / ${setById.size}`);
    console.log(`Total cards missing image: ${totalMissingImages}`);
    console.log(`Total non-EN cards missing nameEn: ${totalMissingNameEn}`);
    console.log(`Sets missing logoUrl: ${setsWithNoLogo}`);
    console.log(`Non-EN sets missing nameEn: ${setsWithNoNameEn}`);

    console.log(`\nTop 10 sets by card gaps:`);
    for (const s of summaries.slice(0, 10)) {
      console.log(
        `  ${s.setId} (${s.setName}, ${s.language}) — images: ${s.missingImages}/${s.totalCards}, nameEn: ${s.missingNameEn}/${s.totalCards}, logo missing: ${s.setLogoMissing}, set nameEn missing: ${s.setNameEnMissing}`
      );
    }
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nFull report written to ${path.relative(process.cwd(), OUT_PATH)}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
