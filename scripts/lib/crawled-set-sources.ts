/**
 * The one list of verified set-logo crawler outputs, and the rules for
 * merging them when two sources disagree.
 *
 * backfill-set-logo-url.ts and backfill-set-name-en.ts previously kept
 * separate, verbatim-identical copies of this list — and then merged them
 * with *different* rules: the logo script took the first file in priority
 * order and dropped within-file duplicates, while the name script silently
 * let the last file win. Two files that describe themselves as mirrors of
 * each other should not disagree about which source wins, so the list and
 * the merge both live here now, with the per-field policy stated explicitly
 * rather than emerging from the order someone happened to write the loop in.
 */
import { loadVerified, dataDir } from "./source-output";
import type { SetLogoEntry, SetLogoFile } from "../data/set-logos/types";

/**
 * Verified crawler-output files, keyed by Set.id, in priority order.
 *
 * pokellector-ja is first because pokellector is already the codebase's
 * trusted JP source for card art (see crawl-pokemon-jp-pokellector-images.ts);
 * dextcg-ja is the fallback for whatever pokellector doesn't cover, and
 * dextcg-cn covers a disjoint locale so in practice never competes with
 * either JA file.
 *
 * bulbapedia-ja.json is deliberately NOT included: every JA set it matched
 * (confirmed live) was already covered by pokellector-ja.json /
 * dextcg-ja.json, so it adds zero net coverage, and for the newer SV-era
 * sets its `setlogo` file is a photographic booster-pack image rather than a
 * clean isolated logo — lower quality than what's already here. Keep it out
 * until it's resolving a real gap, not just re-deriving sets these two
 * already have.
 */
export const CRAWLED_SET_FILES = [
  "pokellector-ja.json",
  "dextcg-ja.json",
  "dextcg-cn.json",
  // scripts/crawl-pokemon-set-logos-bulbapedia.ts — the only source with any
  // zh-tw/ko set-logo coverage at all.
  "bulbapedia-zh-tw.json",
  "bulbapedia-ko.json",
];

/**
 * What to do when two sources give different values for the same Set.
 *
 * "first-wins" — the earlier file in CRAWLED_SET_FILES is used. Correct for
 * `logoUrl`, where spot-checking confirmed the disagreements are the same
 * official logo mirrored from different CDNs (den-media.pokellector.com vs
 * static.dextcg.com), so either value is right and picking deterministically
 * is safe.
 *
 * "drop-on-conflict" — neither value is used, and the Set is left for a
 * human. Correct for `nameEn`, where a disagreement is a real disagreement:
 * these are fan/tracker sites' English glosses of a Japanese set title, not
 * mirrors of one canonical string (see SetLogoEntry.nameEn's doc comment),
 * and a wrong English set name is visible to every user of the app. Better a
 * set keeps no English name than silently gets the loser of a coin flip.
 */
export type ConflictPolicy = "first-wins" | "drop-on-conflict";

/**
 * Merges one field across the verified crawler files into a Set.id -> value
 * map, applying `policy` to cross-file disagreements.
 *
 * A duplicate Set.id *within a single file* with two different values is
 * dropped under BOTH policies — that is never a mirror difference, it is one
 * source contradicting itself (confirmed live: jp.pokellector.com has had
 * two different buttons claiming the same set code). Once dropped, a Set.id
 * stays dropped, so a later file can't resurrect a value the earlier
 * contradiction already made untrustworthy.
 */
export function loadCrawledSetField(
  field: keyof Pick<SetLogoEntry, "logoUrl" | "nameEn">,
  policy: ConflictPolicy
): Map<string, string> {
  const dir = dataDir("set-logos");
  const bySetId = new Map<string, string>();
  const dropped = new Set<string>();

  for (const name of CRAWLED_SET_FILES) {
    const parsed = loadVerified<SetLogoFile>(dir, name);
    if (!parsed) continue;

    const seenInThisFile = new Map<string, string>();
    for (const entry of parsed.entries) {
      const value = entry[field];
      if (!value || dropped.has(entry.setId)) continue;

      const withinFile = seenInThisFile.get(entry.setId);
      if (withinFile !== undefined && withinFile !== value) {
        console.warn(`- ${entry.setId}: conflicting ${field} within ${name}, dropping.`);
        bySetId.delete(entry.setId);
        dropped.add(entry.setId);
        continue;
      }
      seenInThisFile.set(entry.setId, value);

      const existing = bySetId.get(entry.setId);
      if (existing === undefined) {
        bySetId.set(entry.setId, value);
        continue;
      }
      if (existing === value) continue;

      if (policy === "first-wins") continue; // earlier file already claimed it
      console.warn(`- ${entry.setId}: sources disagree on ${field} (${existing} vs ${value}), dropping both.`);
      bySetId.delete(entry.setId);
      dropped.add(entry.setId);
    }
  }

  return bySetId;
}
