/**
 * One-time backfill: writes Set.logoUrl for every already-seeded non-English
 * Pokémon Set row from scripts/data/pokemon-set-logos.ts (hand-curated, keyed
 * by Set.code), falling back to any verified scripts/data/set-logos/*.json
 * crawler output (machine-generated, keyed by Set.id — pokellector-ja.json
 * from crawl-pokemon-set-logos-pokellector.ts, and dextcg-ja.json /
 * dextcg-cn.json from crawl-pokemon-set-logos-dextcg.ts) for codes the hand
 * table has no entry for. The hand table wins on overlap since it's
 * been individually checked; the crawler file only fills gaps. Cheaper than
 * a full `npm run seed:catalog` re-run (which re-pulls Pokémon's entire
 * multi-hundred-set history over the network — see seed-catalog.ts's header
 * comment) since this only needs the Set table, not a live provider fetch.
 * Going forward, new sets get `logoUrl` directly from
 * mapTcgdexSet/seed-catalog.ts (see lib/games/pokemon/mapper.ts) — this
 * script only exists to catch up rows seeded before that table had an
 * entry for their code. Mirrors scripts/backfill-set-name-en.ts.
 *
 * Safe to re-run: every write is keyed by Set.id, only touches rows with a
 * usable source entry, and skips rows that already have a logoUrl (so it
 * never clobbers a value set some other way).
 *
 * Run with: npx tsx scripts/backfill-set-logo-url.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "@/lib/db";
import { POKEMON_SET_LOGOS } from "./data/pokemon-set-logos";
import type { SetLogoFile } from "./data/set-logos/types";

/** Verified crawler-output files to fall back to, keyed by Set.id. */
const CRAWLED_LOGO_FILES = ["pokellector-ja.json", "dextcg-ja.json", "dextcg-cn.json"];

function loadCrawledLogos(): Map<string, string> {
  const bySetId = new Map<string, string>();
  // Defense in depth against a source site itself being internally
  // inconsistent (confirmed live: jp.pokellector.com has two different
  // buttons both claiming set code "S12" — see
  // crawl-pokemon-set-logos-pokellector.ts's guard against that). Even
  // though the crawlers now route such ambiguity to their own review file
  // rather than the main output, a duplicate setId within one file (or the
  // same setId disagreeing across two files) is still trusted less than a
  // clean single match — drop it rather than let last-write-wins silently
  // pick one.
  const conflicted = new Set<string>();
  for (const name of CRAWLED_LOGO_FILES) {
    const file = path.join(process.cwd(), "scripts", "data", "set-logos", name);
    if (!fs.existsSync(file)) continue;
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as SetLogoFile;
    if (!parsed.verified) {
      console.log(`- ${name}: not verified yet, skipping (see its header comment).`);
      continue;
    }
    for (const entry of parsed.entries) {
      if (conflicted.has(entry.setId)) continue;
      const existing = bySetId.get(entry.setId);
      if (existing !== undefined && existing !== entry.logoUrl) {
        console.warn(`- ${entry.setId}: conflicting logoUrl across crawled sources, dropping.`);
        bySetId.delete(entry.setId);
        conflicted.add(entry.setId);
        continue;
      }
      bySetId.set(entry.setId, entry.logoUrl);
    }
  }
  return bySetId;
}

async function main() {
  const crawledLogos = loadCrawledLogos();

  const sets = await db.set.findMany({
    where: { gameId: "pokemon" },
    select: { id: true, code: true, logoUrl: true },
  });

  let updated = 0;
  let alreadySet = 0;
  let noEntry = 0;

  for (const set of sets) {
    const logoUrl = POKEMON_SET_LOGOS[set.code] ?? crawledLogos.get(set.id);
    if (!logoUrl) {
      noEntry += 1;
      continue;
    }
    if (set.logoUrl) {
      alreadySet += 1;
      continue;
    }
    await db.set.update({ where: { id: set.id }, data: { logoUrl } });
    updated += 1;
  }

  console.log(`Updated: ${updated}`);
  console.log(`Already set (left alone): ${alreadySet}`);
  console.log(`No source entry for this set: ${noEntry}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
