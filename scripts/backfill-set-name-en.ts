/**
 * One-time backfill: writes Set.nameEn for every already-seeded non-English
 * Pokémon Set row from scripts/data/pokemon-set-translations.ts (hand-
 * curated, keyed by Set.code), falling back to any verified
 * scripts/data/set-logos/*.json crawler output (keyed by Set.id —
 * pokellector-ja.json and dextcg-ja.json/dextcg-cn.json's `nameEn`, each an
 * English gloss the source site titles the set with) for codes the hand
 * table has no entry for. The hand table wins on overlap; the crawler files
 * only fill gaps, and — being fan/tracker sites' glosses rather than checked
 * translations — are a lower-trust source,
 * so treat any set it fills in the same "not yet confirmed" way as an
 * unresolved entry until spot-checked. Cheaper than a full
 * `npm run seed:catalog` re-run (which re-pulls Pokémon's entire
 * multi-hundred-set history over the network — see seed-catalog.ts's
 * header comment) since this only needs the Set table, not a live provider
 * fetch. Going forward, new sets get `nameEn` directly from
 * mapTcgdexSet/seed-catalog.ts (see lib/games/pokemon/mapper.ts) — this
 * script only exists to catch up rows seeded before that wiring existed.
 *
 * Safe to re-run: every write is keyed by Set.id and only touches rows
 * with a usable source entry.
 *
 * Run with: npx tsx scripts/backfill-set-name-en.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "@/lib/db";
import { POKEMON_SET_TRANSLATIONS } from "./data/pokemon-set-translations";
import type { SetLogoFile } from "./data/set-logos/types";

/** Verified crawler-output files to fall back to, keyed by Set.id. */
const CRAWLED_NAME_FILES = [
  "pokellector-ja.json",
  "dextcg-ja.json",
  "dextcg-cn.json",
  // scripts/crawl-pokemon-set-logos-bulbapedia.ts — zh-tw/ko coverage.
  // bulbapedia-ja.json deliberately excluded, same reasoning as
  // scripts/backfill-set-logo-url.ts's CRAWLED_LOGO_FILES: every JA set it
  // matched was already covered by pokellector-ja.json/dextcg-ja.json.
  "bulbapedia-zh-tw.json",
  "bulbapedia-ko.json",
];

function loadCrawledNames(): Map<string, string> {
  const bySetId = new Map<string, string>();
  for (const name of CRAWLED_NAME_FILES) {
    const file = path.join(process.cwd(), "scripts", "data", "set-logos", name);
    if (!fs.existsSync(file)) continue;
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as SetLogoFile;
    if (!parsed.verified) {
      console.log(`- ${name}: not verified yet, skipping (see its header comment).`);
      continue;
    }
    for (const entry of parsed.entries) bySetId.set(entry.setId, entry.nameEn);
  }
  return bySetId;
}

async function main() {
  const crawledNames = loadCrawledNames();

  const sets = await db.set.findMany({
    where: { gameId: "pokemon" },
    select: { id: true, code: true, name: true, nameEn: true },
  });

  let updated = 0;
  let alreadySet = 0;
  let noTranslation = 0;

  for (const set of sets) {
    const translation = POKEMON_SET_TRANSLATIONS[set.code] ?? crawledNames.get(set.id);
    if (!translation) {
      // English pokemontcg.io sets (code has no "<lang>:" prefix) and any
      // non-English set not yet in the table both land here.
      if (/^(ja|zh-cn|zh-tw|ko):/.test(set.code)) noTranslation += 1;
      continue;
    }
    if (set.nameEn === translation) {
      alreadySet += 1;
      continue;
    }
    await db.set.update({ where: { id: set.id }, data: { nameEn: translation } });
    updated += 1;
  }

  console.log(`Updated: ${updated}`);
  console.log(`Already up to date: ${alreadySet}`);
  console.log(`Non-English sets with no translation-table entry: ${noTranslation}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
