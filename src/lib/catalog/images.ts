import { db } from "@/lib/db";

/**
 * Fills in missing catalog images, and *only* missing ones.
 *
 * Deliberately not `upsertManualCatalogItem` (see ./manual.ts): that one is a
 * full-authority upsert which normalizes every unsupplied optional to null, so
 * pointing it at an existing provider-sourced row to set one field would wipe
 * that row's rarity/artist/nameEn. This is the narrow tool — it touches the two
 * image columns and nothing else, and it never creates a row.
 */

export interface CatalogImagePatch {
  gameId: string;
  /** Provider id, e.g. "ja:SM10-034" — NOT the CatalogItem primary key. */
  externalId: string;
  imageSmallUrl: string;
  imageLargeUrl: string;
}

export type PatchOutcome = "filled" | "already-set" | "no-such-row";
export type PatchSummary = Record<PatchOutcome, number>;

export async function applyCatalogImagePatches(
  patches: CatalogImagePatch[],
  opts: { dryRun?: boolean } = {}
): Promise<PatchSummary> {
  const summary: PatchSummary = { filled: 0, "already-set": 0, "no-such-row": 0 };
  if (patches.length === 0) return summary;

  // One query per game to learn the target universe, rather than a round-trip
  // per patch just to discover "already set" — this runs over ~15k patches.
  const gameIds = [...new Set(patches.map((p) => p.gameId))];
  const missingByGame = new Map<string, Set<string>>();
  const existingByGame = new Map<string, Set<string>>();
  for (const gameId of gameIds) {
    const [missing, all] = await Promise.all([
      db.catalogItem.findMany({
        where: { gameId, imageSmallUrl: null },
        select: { externalId: true },
      }),
      db.catalogItem.findMany({ where: { gameId }, select: { externalId: true } }),
    ]);
    missingByGame.set(gameId, new Set(missing.map((r) => r.externalId)));
    existingByGame.set(gameId, new Set(all.map((r) => r.externalId)));
  }

  const toWrite: CatalogImagePatch[] = [];
  for (const patch of patches) {
    const missing = missingByGame.get(patch.gameId);
    const existing = existingByGame.get(patch.gameId);
    if (!existing?.has(patch.externalId)) {
      // This backfill only fills gaps in the catalog; it never invents cards.
      summary["no-such-row"] += 1;
    } else if (!missing?.has(patch.externalId)) {
      summary["already-set"] += 1;
    } else {
      toWrite.push(patch);
    }
  }

  if (opts.dryRun) {
    summary.filled = toWrite.length;
    return summary;
  }

  for (const patch of toWrite) {
    // updateMany on (gameId, externalId) rather than a by-id update: the
    // uniqueness key is (gameId, externalId, variantKey), so a card split into
    // priced finish variants has sibling rows that all want the same art.
    // The imageSmallUrl:null guard means a provider-supplied image always wins.
    const res = await db.catalogItem.updateMany({
      where: { gameId: patch.gameId, externalId: patch.externalId, imageSmallUrl: null },
      data: { imageSmallUrl: patch.imageSmallUrl, imageLargeUrl: patch.imageLargeUrl },
    });
    if (res.count > 0) summary.filled += 1;
    else summary["already-set"] += 1;
  }

  return summary;
}
