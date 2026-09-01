/**
 * One-time backfill: writes Set.logoUrl for every already-seeded non-English
 * Pokémon Set row from scripts/data/pokemon-set-logos.ts (hand-curated, keyed
 * by Set.code), falling back to any verified scripts/data/set-logos/*.json
 * crawler output (machine-generated, keyed by Set.id — pokellector-ja.json
 * from crawl-pokemon-set-logos-pokellector.ts, and dextcg-ja.json /
 * dextcg-cn.json from crawl-pokemon-set-logos-dextcg.ts) for codes the hand
 * table has no entry for. The hand table wins on overlap since it's
 * been individually checked; the crawler files only fill gaps, and when
 * more than one crawler file has an entry for the same Set.id, the earlier
 * file in CRAWLED_LOGO_FILES wins (see its comment) rather than the row
 * being dropped — spot-checks show these are mirror-CDN differences, not
 * real data disagreements. Cheaper than
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

/**
 * Verified crawler-output files to fall back to, keyed by Set.id, in
 * priority order: when two files both have an entry for the same Set.id,
 * the earlier file in this list wins rather than either being dropped.
 * pokellector-ja is listed first because pokellector is already the
 * codebase's trusted JP source for card art (see
 * crawl-pokemon-jp-pokellector-images.ts); dextcg-ja is the fallback for
 * whatever pokellector doesn't cover, and dextcg-cn covers a disjoint
 * locale so in practice never competes with either JA file. Spot-checking
 * confirmed disagreements between pokellector-ja and dextcg-ja here are
 * NOT data errors — both sides show the correct official logo for the set,
 * just mirrored from different CDNs (den-media.pokellector.com vs
 * static.dextcg.com) — so picking one deterministically is safe.
 */
const CRAWLED_LOGO_FILES = [
  "pokellector-ja.json",
  "dextcg-ja.json",
  "dextcg-cn.json",
  // scripts/crawl-pokemon-set-logos-bulbapedia.ts — the only source with any
  // zh-tw/ko set-logo coverage at all. bulbapedia-ja.json is deliberately
  // NOT included: every JA set it matched (confirmed live) was already
  // covered by pokellector-ja.json/dextcg-ja.json, so it adds zero net
  // coverage, and for the newer SV-era sets its `setlogo` file is a
  // photographic booster-pack image rather than a clean isolated logo —
  // lower quality than what's already here. Keep it out until it's
  // resolving a real gap, not just re-deriving sets these two already have.
  "bulbapedia-zh-tw.json",
  "bulbapedia-ko.json",
];

function loadCrawledLogos(): Map<string, string> {
  const bySetId = new Map<string, string>();
  // Within a single file, a duplicate setId is still a real ambiguity (not
  // a cross-source mirror difference) — confirmed live: jp.pokellector.com
  // has had two different buttons both claiming the same set code (see
  // crawl-pokemon-set-logos-pokellector.ts's guard against that). The
  // crawlers now route that case to their own review file instead of the
  // main output, but if one ever slips through, drop it here rather than
  // let last-write-wins silently pick one.
  const droppedWithinFile = new Set<string>();
  for (const name of CRAWLED_LOGO_FILES) {
    const file = path.join(process.cwd(), "scripts", "data", "set-logos", name);
    if (!fs.existsSync(file)) continue;
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as SetLogoFile;
    if (!parsed.verified) {
      console.log(`- ${name}: not verified yet, skipping (see its header comment).`);
      continue;
    }
    const seenInThisFile = new Map<string, string>();
    for (const entry of parsed.entries) {
      if (droppedWithinFile.has(entry.setId)) continue;
      const dupe = seenInThisFile.get(entry.setId);
      if (dupe !== undefined && dupe !== entry.logoUrl) {
        console.warn(`- ${entry.setId}: conflicting logoUrl within ${name}, dropping.`);
        bySetId.delete(entry.setId);
        droppedWithinFile.add(entry.setId);
        continue;
      }
      seenInThisFile.set(entry.setId, entry.logoUrl);
      // A higher-priority file (earlier in CRAWLED_LOGO_FILES) has already
      // claimed this setId — keep its value rather than overwriting.
      if (bySetId.has(entry.setId)) continue;
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
