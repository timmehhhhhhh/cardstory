/**
 * Applies the derived image-mapping files under scripts/data/card-images/ to
 * the catalog, filling in images for cards whose provider had none.
 *
 * The mapping files are produced by the crawlers (crawl-pokemon-ja-images.ts,
 * crawl-pokemon-tw-images.ts, crawl-pokemon-cn-images.ts) and by hand for
 * small sets like the FAB promos.
 * Following the same gate as seed-pokemon-manual.ts, a file whose `verified`
 * flag is still false is skipped with a warning rather than seeded on trust —
 * flip it only after reading the crawler's derive summary and spot-checking
 * rows against the live source pages.
 *
 * Safe to re-run: applyCatalogImagePatches only ever writes to rows whose
 * image is currently null, so a provider-supplied image always wins and
 * re-running is a no-op.
 *
 *   npx tsx scripts/seed-card-images.ts [--dry-run]
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "@/lib/db";
import { applyCatalogImagePatches, type CatalogImagePatch } from "@/lib/catalog/images";
import type { CardImageFile } from "./data/card-images/types";
import { FAB_PROMO_IMAGES } from "./data/card-images/fab-promos";

const DATA_DIR = path.join(process.cwd(), "scripts", "data", "card-images");

/** JSON files written by the crawlers. Missing ones are skipped, not fatal. */
const JSON_FILES = [
  "pokemon-tw.json",
  "pokemon-ja.json",
  "pokemon-cn.json",
  "pokemon-jp-pokellector.json",
  "pokemon-jp-uk.json",
  "pokemon-jp-pricecharting.json",
  "pokemon-kr.json",
];

function loadJsonFile(name: string): CardImageFile | null {
  const file = path.join(DATA_DIR, name);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as CardImageFile;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("DRY RUN — no writes.\n");

  const files: CardImageFile[] = [];
  for (const name of JSON_FILES) {
    const f = loadJsonFile(name);
    if (!f) {
      console.log(`- ${name}: not present, skipping (run the crawler first).`);
      continue;
    }
    files.push(f);
  }
  files.push(FAB_PROMO_IMAGES);

  const totals = { filled: 0, "already-set": 0, "no-such-row": 0, skipped: 0 };

  for (const file of files) {
    const label = `${file.gameId} (${file.entries.length} entries)`;
    if (!file.verified) {
      console.warn(
        `! ${label}: SKIPPED — verified is false. Review the entries, then flip it.\n  ${file.sourceNote}`
      );
      totals.skipped += file.entries.length;
      continue;
    }

    const patches: CatalogImagePatch[] = file.entries.map((e) => ({
      gameId: file.gameId,
      externalId: e.externalId,
      imageSmallUrl: e.imageSmallUrl,
      imageLargeUrl: e.imageLargeUrl,
    }));

    const summary = await applyCatalogImagePatches(patches, { dryRun });
    console.log(
      `✓ ${label}: filled ${summary.filled}, already-set ${summary["already-set"]}, no-such-row ${summary["no-such-row"]}`
    );
    totals.filled += summary.filled;
    totals["already-set"] += summary["already-set"];
    totals["no-such-row"] += summary["no-such-row"];
  }

  console.log(
    `\nDone. filled ${totals.filled}, already-set ${totals["already-set"]}, ` +
      `no-such-row ${totals["no-such-row"]}, skipped ${totals.skipped}.`
  );
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
