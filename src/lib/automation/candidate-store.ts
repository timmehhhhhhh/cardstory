/**
 * Shared writer for `CrawledImageCandidate` rows — the staged review queue
 * every crawl job (pokemon/image-crawl.ts, pokemon/set-logo-crawl.ts,
 * sports/image-scrape.ts) writes to instead of touching CatalogItem/Set/
 * SportsCardItem directly. See scripts/review-image-candidates.ts for the
 * human review/apply step.
 *
 * `CrawledImageCandidate` has no natural-key unique constraint (see
 * prisma/schema.prisma's doc comment — it's a staging table, not upserted
 * catalog data), so "safe to re-run" here means find-then-write rather than
 * a DB-level upsert: a still-pending candidate for the same
 * (source, targetType, target id) is updated in place instead of
 * duplicated; an already-reviewed one (applied/rejected) is left alone so a
 * re-crawl never resurrects a human's decision.
 */
import { db } from "@/lib/db";

export interface ImageCandidateInput {
  source: string;
  targetType: "catalogItem" | "set" | "sportsCardItem";
  catalogItemGameId?: string;
  catalogItemExternalId?: string;
  setId?: string;
  sportsCardItemId?: string;
  imageUrl?: string;
  imageBackUrl?: string;
  logoUrl?: string;
  sourceUrl: string;
}

function targetWhere(input: ImageCandidateInput) {
  return {
    source: input.source,
    targetType: input.targetType,
    catalogItemGameId: input.catalogItemGameId ?? null,
    catalogItemExternalId: input.catalogItemExternalId ?? null,
    setId: input.setId ?? null,
    sportsCardItemId: input.sportsCardItemId ?? null,
  };
}

/** Returns "created" | "updated" | "already-reviewed" (a human already applied/rejected this target from this source — left untouched). */
export async function upsertImageCandidate(input: ImageCandidateInput): Promise<"created" | "updated" | "already-reviewed"> {
  const existing = await db.crawledImageCandidate.findFirst({
    where: targetWhere(input),
    orderBy: { discoveredAt: "desc" },
    select: { id: true, status: true },
  });

  if (existing) {
    if (existing.status !== "pending") return "already-reviewed";
    await db.crawledImageCandidate.update({
      where: { id: existing.id },
      data: {
        imageUrl: input.imageUrl ?? null,
        imageBackUrl: input.imageBackUrl ?? null,
        logoUrl: input.logoUrl ?? null,
        sourceUrl: input.sourceUrl,
        discoveredAt: new Date(),
      },
    });
    return "updated";
  }

  await db.crawledImageCandidate.create({
    data: {
      ...targetWhere(input),
      imageUrl: input.imageUrl ?? null,
      imageBackUrl: input.imageBackUrl ?? null,
      logoUrl: input.logoUrl ?? null,
      sourceUrl: input.sourceUrl,
      status: "pending",
    },
  });
  return "created";
}
