/**
 * "What content is missing?" — the queries that decide what a crawl should go
 * and fetch, and what the missing-content report shows.
 *
 * These predicates were previously written out at roughly ten call sites
 * across three layers: the one-off crawlers in scripts/, the cron jobs in
 * src/lib/automation/, and scripts/report-missing-content.ts (which computed
 * the only complete picture but exported nothing, so nothing could reuse it).
 * Finding the gaps is the first step of essentially every card-image or
 * set-logo sourcing task, so it should be one import, not a query rewritten
 * from memory each time.
 *
 * Lives in src/ rather than scripts/ deliberately: the cron path under
 * src/lib/automation/ can import from here without reaching across the
 * src<->scripts boundary the way it currently reaches into
 * scripts/lib/polite-fetch.ts. Nothing here touches the filesystem, so it is
 * safe to call from a Cloudflare Worker.
 */
import { db } from "@/lib/db";

/**
 * Non-English Set.id and Set.code are both language-prefixed
 * ("pokemon:zh-tw:S12a" / "zh-tw:S12a"); English ones carry no prefix. That
 * fact was previously encoded four incompatible ways — a hardcoded
 * `/^(ja|zh-cn|zh-tw|ko):/` alternation, a generic
 * `/^[a-z]{2}(-[a-z]{2})?:/` test, a `BULBAPEDIA_TARGET_LANGS` array, and
 * bare `startsWith("pokemon:ja:")` string comparisons. One parser instead.
 *
 * @returns the language tag, or null for an unprefixed (English) code.
 */
export function parseSetLanguage(code: string): string | null {
  const m = /^([a-z]{2}(?:-[a-z]{2})?):/.exec(code);
  return m ? m[1] : null;
}

/** Strips the language prefix from a Set.code, e.g. "zh-tw:S12a" -> "S12a". */
export function bareSetCode(code: string): string {
  return code.replace(/^[a-z]{2}(?:-[a-z]{2})?:/, "");
}

/**
 * Set codes (language prefix stripped) that still have at least one card with
 * no small image — i.e. the sets a card-image crawl should target.
 *
 * The `items: { some: { imageSmallUrl: null } }` relational filter is the
 * important part: it keeps the "which sets are worth crawling" decision in
 * the database instead of loading the whole catalog to count nulls in JS.
 */
export async function setCodesWithMissingCardImages(
  lang: string,
  gameId = "pokemon"
): Promise<string[]> {
  const rows = await db.set.findMany({
    where: { id: { startsWith: `${gameId}:${lang}:` }, items: { some: { imageSmallUrl: null } } },
    select: { code: true },
  });
  return rows.map((r) => bareSetCode(r.code)).filter(Boolean);
}

/** Full Set rows (not just codes) for a language, for crawlers that need name/cardCount to match on. */
export async function setsForLanguage(lang: string, gameId = "pokemon") {
  return db.set.findMany({
    where: { id: { startsWith: `${gameId}:${lang}:` } },
    select: { id: true, code: true, name: true, nameEn: true, cardCount: true, logoUrl: true },
    orderBy: { releaseDate: "asc" },
  });
}

/** Sets with no logoUrl — what a set-logo crawl should target. Omit `lang` for every language. */
export async function setsMissingLogo(lang?: string, gameId = "pokemon") {
  return db.set.findMany({
    where: {
      logoUrl: null,
      ...(lang ? { id: { startsWith: `${gameId}:${lang}:` } } : { gameId }),
    },
    select: { id: true, code: true, name: true, nameEn: true, cardCount: true },
  });
}

/** Non-English catalog rows with no English name yet. */
export async function catalogItemsMissingNameEn(gameId = "pokemon") {
  return db.catalogItem.findMany({
    where: { gameId, language: { not: "EN" }, nameEn: null },
    select: { id: true, name: true, nameEn: true, language: true },
  });
}

/** Distinct set ids holding cards with no national Pokédex numbers. */
export async function setIdsMissingDexNumbers(gameId = "pokemon"): Promise<string[]> {
  const rows = await db.catalogItem.findMany({
    where: { gameId, nationalPokedexNumbers: { isEmpty: true } },
    select: { setId: true },
    distinct: ["setId"],
  });
  return rows.map((r) => r.setId).filter((id): id is string => Boolean(id));
}

/**
 * Sports rows missing an image, keyset-paginated by id.
 *
 * "Non-parallel" is `parallelName IS NULL OR parallelName = ''` — the same
 * definition SportsCardItem's own doc comment uses. Parallels are excluded
 * because they share the base card's art, so sourcing an image for one is
 * not a gap worth crawling.
 */
export async function sportsRowsMissingImage(opts: { afterId?: string; take: number }) {
  return db.sportsCardItem.findMany({
    where: {
      imageUrl: null,
      OR: [{ parallelName: null }, { parallelName: "" }],
      ...(opts.afterId ? { id: { gt: opts.afterId } } : {}),
    },
    select: {
      id: true,
      sport: true,
      year: true,
      distributor: true,
      setName: true,
      playerName: true,
      cardNumber: true,
    },
    orderBy: { id: "asc" },
    take: opts.take,
  });
}

// ---------------------------------------------------------------------------
// Aggregate gap reporting — the shape scripts/report-missing-content.ts writes.

export interface SetGapSummary {
  setId: string;
  setName: string;
  language: string;
  missingImages: number;
  missingNameEn: number;
  totalCards: number;
  setLogoMissing: boolean;
  setNameEnMissing: boolean;
}

export interface SportsGroupGapSummary {
  sport: string;
  year: number | null;
  distributor: string | null;
  setName: string;
  totalNonParallelCards: number;
  missingImages: number;
  missingSetLogo: boolean;
}

export interface SetGapReport {
  /** Only the sets that have at least one gap, sorted worst-first. */
  gaps: SetGapSummary[];
  /** Every set in the game, gap or not — the denominator for "N of M sets have gaps". */
  totalSets: number;
}

/**
 * Every set in a game that has any gap at all, sorted worst-first by card
 * gaps. Aggregates in JS rather than SQL because it needs four different
 * counts over the same rows and the catalog fits comfortably in memory.
 */
export async function collectSetGaps(gameId: string): Promise<SetGapReport> {
  const sets = await db.set.findMany({
    where: { gameId },
    select: { id: true, name: true, code: true, logoUrl: true, nameEn: true },
  });

  const items = await db.catalogItem.findMany({
    where: { gameId },
    select: { setId: true, language: true, imageSmallUrl: true, imageLargeUrl: true, nameEn: true },
  });

  const bySet = new Map<
    string,
    { missingImages: number; missingNameEn: number; total: number; language: string }
  >();
  for (const item of items) {
    if (!item.setId) continue;
    const entry =
      bySet.get(item.setId) ?? { missingImages: 0, missingNameEn: 0, total: 0, language: item.language };
    entry.total += 1;
    if (!item.imageSmallUrl && !item.imageLargeUrl) entry.missingImages += 1;
    if (item.language !== "EN" && !item.nameEn) entry.missingNameEn += 1;
    bySet.set(item.setId, entry);
  }

  const summaries: SetGapSummary[] = [];
  for (const set of sets) {
    const cardGaps = bySet.get(set.id);
    const summary: SetGapSummary = {
      setId: set.id,
      setName: set.name,
      language: cardGaps?.language ?? "EN",
      missingImages: cardGaps?.missingImages ?? 0,
      missingNameEn: cardGaps?.missingNameEn ?? 0,
      totalCards: cardGaps?.total ?? 0,
      setLogoMissing: !set.logoUrl,
      // A set whose name is already English needs no separate nameEn, so only
      // language-prefixed codes can be "missing" one.
      setNameEnMissing: set.name !== set.nameEn && !set.nameEn && parseSetLanguage(set.code) !== null,
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
  return { gaps: summaries, totalSets: sets.length };
}

export interface SportsGapReport {
  gaps: SportsGroupGapSummary[];
  /** Every non-parallel row considered — the denominator the report prints. */
  totalNonParallelCards: number;
}

/** Sports gaps grouped by the denormalized sport|year|distributor|setName product-line identity. */
export async function collectSportsGaps(): Promise<SportsGapReport> {
  const rows = await db.sportsCardItem.findMany({
    where: { OR: [{ parallelName: null }, { parallelName: "" }] },
    select: { sport: true, year: true, distributor: true, setName: true, imageUrl: true, setLogoUrl: true },
  });

  const byGroup = new Map<string, SportsGroupGapSummary>();
  for (const row of rows) {
    const key = `${row.sport}|${row.year ?? ""}|${row.distributor ?? ""}|${row.setName}`;
    const entry =
      byGroup.get(key) ??
      ({
        sport: row.sport,
        year: row.year,
        distributor: row.distributor,
        setName: row.setName,
        totalNonParallelCards: 0,
        missingImages: 0,
        missingSetLogo: !row.setLogoUrl,
      } satisfies SportsGroupGapSummary);
    entry.totalNonParallelCards += 1;
    if (!row.imageUrl) entry.missingImages += 1;
    if (!row.setLogoUrl) entry.missingSetLogo = true;
    byGroup.set(key, entry);
  }

  const gaps = [...byGroup.values()]
    .filter((s) => s.missingImages > 0 || s.missingSetLogo)
    .sort((a, b) => b.missingImages - a.missingImages);
  return { gaps, totalNonParallelCards: rows.length };
}
