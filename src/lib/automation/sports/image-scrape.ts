/**
 * Sports card image/logo backfill — off by default. Mirrors
 * src/lib/pricing/ebay/client.ts's `isEbaySoldCompsEnabled()` gating
 * convention (an explicit opt-in env var, same posture as
 * EBAY_SOLD_COMPS_ENABLED) precisely because scraping a checklist site's
 * public gallery pages, unlike pokemontcg.io/TCGdex, is not a documented,
 * ToS-safe API — see src/lib/automation/sports/profiles.ts's header for the
 * candidate sites and their unconfirmed compliance status.
 *
 * IMPORTANT: `SPORTS_IMAGE_SCRAPE_ENABLED` MUST stay unset/"false" until a
 * human has read the chosen source's robots.txt and Terms of Service and
 * confirmed scraping its checklist pages is allowed. This module
 * deliberately does not attempt that check itself (no outbound network call
 * happens here beyond what isSportsImageScrapeEnabled() gates), and does not
 * ship a working scraper body against a real site — see `scrapeChunk` below.
 *
 * Query target (real, and safe to wire up regardless of the flag): every
 * non-parallel SportsCardItem row missing imageUrl — `parallelName IS NULL
 * OR parallelName = ''`, the exact "non-parallel" definition confirmed
 * against the schema (see prisma/schema.prisma's SportsCardItem.parallelName
 * doc comment) — chunked via a CronJobState cursor, same pattern as every
 * other job in src/lib/automation/.
 *
 * Every match — image AND set/product logo — is staged into
 * CrawledImageCandidate (status: "pending") and NEVER auto-applied: this leg
 * is the ToS-gray one, and a bad heuristic match on a real card is worse
 * than a gap. Reviewed via scripts/review-image-candidates.ts.
 */
import { db } from "@/lib/db";
import { getCronCursor, recordCronSuccess, recordCronError } from "@/lib/automation/cron-job-state";
import { upsertImageCandidate } from "@/lib/automation/candidate-store";
import { SPORTS_IMAGE_SOURCE_PROFILES } from "./profiles";

export const SPORTS_IMAGE_BACKFILL_JOB_NAME = "sports-image-backfill";

export function isSportsImageScrapeEnabled(): boolean {
  return process.env.SPORTS_IMAGE_SCRAPE_ENABLED === "true";
}

/** Truthful/contactable, same reasoning as scripts/lib/polite-fetch.ts's USER_AGENT. */
export function sportsImageScrapeUserAgent(): string {
  return (
    process.env.SPORTS_IMAGE_SCRAPE_USER_AGENT ??
    "CardStorySportsImageBackfill/1.0 (non-parallel sports card image/logo backfill; contact via repo)"
  );
}

interface SportsImageBackfillCursor {
  /** SportsCardItem.id to resume after, ordered by id — a plain keyset cursor since this table has no CrawlRecord-style external id space. */
  afterId: string | null;
}

export interface SportsImageBackfillSummary {
  skipped: boolean;
  scanned: number;
  candidatesStaged: number;
  cursorWrapped: boolean;
}

const CHUNK_SIZE = 60;

/**
 * Placeholder scrape body: this is where a real request against a confirmed-
 * allowed source (see profiles.ts) would go, using
 * scripts/lib/generic-scrape.ts's profile-driven extraction plus a dedicated
 * `scripts/lib/polite-fetch.ts`-style instance paced slower than the
 * Pokémon crawlers (e.g. 1.5s — these are new, unproven targets; see the
 * plan's §4). Left unimplemented on purpose: no candidate source has a
 * confirmed robots.txt/ToS clearance yet (see profiles.ts), and this
 * function must never be reached with the flag on until one does. Returns
 * `null` (no candidate found) for every row until then.
 */
async function scrapeForCard(input: {
  sport: string;
  year: number | null;
  distributor: string | null;
  setName: string;
  playerName: string;
  cardNumber: string | null;
}): Promise<{ imageUrl?: string; logoUrl?: string; sourceUrl: string } | null> {
  // Every candidate source is "unconfirmed" (see profiles.ts) — nothing to
  // scrape against yet, so every row is reported as "no candidate found"
  // regardless of what it describes.
  void input;
  void SPORTS_IMAGE_SOURCE_PROFILES; // referenced once a real source is wired up — see this function's doc comment
  return null;
}

export async function runSportsImageBackfillChunk(): Promise<SportsImageBackfillSummary> {
  if (!isSportsImageScrapeEnabled()) {
    return { skipped: true, scanned: 0, candidatesStaged: 0, cursorWrapped: false };
  }

  const jobName = SPORTS_IMAGE_BACKFILL_JOB_NAME;
  try {
    const cursor = await getCronCursor<SportsImageBackfillCursor>(jobName);

    const rows = await db.sportsCardItem.findMany({
      where: {
        imageUrl: null,
        OR: [{ parallelName: null }, { parallelName: "" }],
        ...(cursor?.afterId ? { id: { gt: cursor.afterId } } : {}),
      },
      select: { id: true, sport: true, year: true, distributor: true, setName: true, playerName: true, cardNumber: true },
      orderBy: { id: "asc" },
      take: CHUNK_SIZE,
    });

    let staged = 0;
    for (const row of rows) {
      const found = await scrapeForCard(row);
      if (!found) continue;
      await upsertImageCandidate({
        source: "sports-image-scrape",
        targetType: "sportsCardItem",
        sportsCardItemId: row.id,
        imageUrl: found.imageUrl,
        logoUrl: found.logoUrl,
        sourceUrl: found.sourceUrl,
      });
      staged += 1;
    }

    const cursorWrapped = rows.length < CHUNK_SIZE;
    const nextAfterId = cursorWrapped ? null : rows[rows.length - 1]?.id ?? null;

    await recordCronSuccess(jobName, { afterId: nextAfterId }, { scanned: rows.length, candidatesStaged: staged, cursorWrapped });
    return { skipped: false, scanned: rows.length, candidatesStaged: staged, cursorWrapped };
  } catch (err) {
    await recordCronError(jobName, (err as Error).message);
    throw err;
  }
}
