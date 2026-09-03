/**
 * The shared crawl/derive runner the per-source card-image crawlers are built
 * on.
 *
 * Every one of those crawlers was a hand-written variation on the same
 * skeleton: resume a cache, fetch detail pages politely, then replay the
 * cache offline to match each scraped row against a catalog row through a
 * fixed chain of guards, writing everything that passed to one file and
 * everything that didn't to a review file. The variation that actually
 * matters per source is small — how a card's URL is built, how its page
 * parses, which externalIds to try, and how to compare names — so that is
 * exactly what a `CardImageSource` supplies, and the runner owns the rest.
 *
 * The guard chain is the point of this module, not an implementation detail.
 * In order: parseable -> catalog row exists -> name matches -> target is
 * actually empty. A row that fails any of them goes to the review file with
 * a reason rather than being dropped, so the review file always accounts for
 * every card the crawl found. Never loosen a guard to raise the fill rate —
 * the failure mode is silently attaching the wrong art to a card, which no
 * one notices until a collector does.
 */
import { openCrawlCache, type CrawlCache, type CrawlRecord } from "./crawl-cache";
import { CrawlAbortedError, createPoliteFetcher } from "./polite-fetch";
import { printDeriveSummary, writeMappingFile, writeReviewFile } from "./source-output";
import type {
  CardImageEntry,
  CardImageFile,
  CardImageReviewEntry,
  CardImageReviewFile,
  ReviewReason,
} from "../data/card-images/types";

/** The catalog columns every source's guards are allowed to see. */
export interface CatalogRow {
  externalId: string;
  name: string;
  imageSmallUrl: string | null;
  /** Only pokellector's guard uses this, but selecting one extra column costs nothing. */
  cardType?: string | null;
}

export type GuardResult =
  | {
      ok: true;
      /**
       * The source's own name for the card, when it differs from the
       * catalog's and the match is still trusted — e.g. a scrape artifact in
       * our catalog that the source spells correctly. Collected into a
       * separate corrections file for a human to apply; never auto-applied.
       */
      correction?: { externalId: string; oldName: string; newName: string };
    }
  | { ok: false; reason: ReviewReason; catalogName?: string };

export interface CardImageSource<TRec extends CrawlRecord> {
  /** Output basename, e.g. "pokemon-ja" -> pokemon-ja.json + pokemon-ja.review.json. */
  name: string;
  /** crawl-cache name, e.g. "pokemon-ja-crawl". */
  cacheName: string;
  /** externalId prefix and Set.id language segment, e.g. "ja" or "zh-tw". */
  lang: string;
  /** Directory the two output files go in. */
  outDir: string;
  sourceNote: string;
  reviewNote: string;

  /** Cached records worth deriving from. Defaults to `status === 200`. */
  isFetched?(rec: TRec): boolean;
  /**
   * Fills in fields that can be recovered from what was already cached,
   * before the parseable/unparseable split decides a record's fate. Runs
   * offline, so a later fix here costs a re-derive rather than a re-crawl —
   * which is the entire reason the raw crawl is cached separately.
   */
  prepare?(rec: TRec): TRec;
  /** Whether a fetched record yielded the fields the mapping needs. */
  isParseable(rec: TRec): boolean;
  /** The page this record came from, for attribution and re-checking. */
  sourceUrl(rec: TRec): string;
  /** Provenance echoed into both output files. */
  provenance(rec: TRec): { sourceName: string; sourceSetLabel: string; sourceNumber: string };
  /**
   * The set code as the SOURCE prints it, bare (no language prefix), or null
   * when the record has none. Used only to tell "this set isn't in our
   * catalog at all" apart from "the set is ours but this card isn't" when a
   * lookup misses.
   */
  sourceSetCode(rec: TRec): string | null;
  /** Candidate externalIds in preference order, e.g. zero-padded then raw. */
  candidates(rec: TRec): string[];
  /** Runs before the catalog lookup, for source-specific disqualifications. */
  preCheck?(rec: TRec): { reason: ReviewReason } | null;
  nameGuard(rec: TRec, row: CatalogRow): GuardResult;
  imageUrls(rec: TRec): { small: string; large: string };
  /** Appended in parentheses to the summary's Mapped line, e.g. a secondary-guard count. */
  mappedSuffix?(result: DeriveResult): string | undefined;
  /** Extra summary lines, e.g. a corrections count. */
  extraLines?(result: DeriveResult): string[];
}

export interface DeriveInput<TRec extends CrawlRecord> {
  source: CardImageSource<TRec>;
  /** externalId -> catalog row, for this source's language. */
  byExternalId: Map<string, CatalogRow>;
  /**
   * Bare set codes this language actually has in the catalog. Supplying it
   * enables the unknown-set-code / no-catalog-row distinction; omit it and
   * every lookup miss is reported as no-catalog-row.
   */
  knownSetCodes?: Set<string>;
}

export interface DeriveResult {
  entries: CardImageEntry[];
  review: CardImageReviewEntry[];
  corrections: { externalId: string; oldName: string; newName: string; sourceUrl: string }[];
  alreadyHadImage: number;
}

/**
 * Replays a crawl cache into a mapping file and a review file. Offline: no
 * network, so it is cheap to re-run after any change to the matching rules,
 * which is the whole reason the raw crawl is cached separately.
 */
export function deriveFromCache<TRec extends CrawlRecord>(input: DeriveInput<TRec>): DeriveResult {
  const { source, byExternalId, knownSetCodes } = input;
  const cache = openCrawlCache<TRec>(source.cacheName);
  const isFetched = source.isFetched ?? ((r: TRec) => r.status === 200);
  const prepare = source.prepare ?? ((r: TRec) => r);
  const found = cache.all().filter(isFetched).map(prepare);
  // Split rather than filter: a page we fetched but couldn't parse belongs in
  // the review file, not the bin. Dropping these silently is what made an
  // earlier run report "Review: 0" while discarding 132 cards.
  const records = found.filter((r) => source.isParseable(r));
  const unparseable = found.filter((r) => !source.isParseable(r));
  cache.close();
  console.log(`Cards found: ${found.length} (${records.length} parseable, ${unparseable.length} not)`);

  const entries: CardImageEntry[] = [];
  const corrections: DeriveResult["corrections"] = [];
  let alreadyHadImage = 0;

  const review: CardImageReviewEntry[] = unparseable.map((r) => ({
    reason: "missing-page-fields" as const,
    sourceId: r.id,
    sourceUrl: source.sourceUrl(r),
    ...source.provenance(r),
  }));

  for (const rec of records) {
    const sourceUrl = source.sourceUrl(rec);
    const base = { sourceId: rec.id, sourceUrl, ...source.provenance(rec) };

    const pre = source.preCheck?.(rec);
    if (pre) {
      review.push({ ...base, reason: pre.reason });
      continue;
    }

    const candidates = source.candidates(rec);
    const externalId = candidates.find((c) => byExternalId.has(c));

    if (!externalId) {
      // Distinguishing these two is the difference between "we need to crawl
      // more of this set" and "this set isn't in our catalog at all", which
      // are completely different follow-up actions for whoever reads the
      // review file.
      const setCode = source.sourceSetCode(rec);
      const unknownSet = knownSetCodes !== undefined && setCode !== null && !knownSetCodes.has(setCode);
      review.push({
        ...base,
        reason: unknownSet ? "unknown-set-code" : "no-catalog-row",
        candidateExternalId: candidates[0],
      });
      continue;
    }

    const row = byExternalId.get(externalId)!;

    // The name guard. This is what independently catches a wrong set code,
    // bad number padding, or the page structure drifting.
    const guard = source.nameGuard(rec, row);
    if (!guard.ok) {
      review.push({
        ...base,
        reason: guard.reason,
        candidateExternalId: externalId,
        ...(guard.catalogName !== undefined ? { catalogName: guard.catalogName } : {}),
      });
      continue;
    }
    if (guard.correction) corrections.push({ ...guard.correction, sourceUrl });

    if (row.imageSmallUrl) {
      alreadyHadImage += 1; // provider already supplied art; leave it alone
      continue;
    }

    const { small, large } = source.imageUrls(rec);
    entries.push({
      externalId,
      imageSmallUrl: small,
      imageLargeUrl: large,
      sourceUrl,
      // When the guard corrected our catalog's name, record the corrected
      // spelling as what this row was matched against — that is what was
      // actually compared, and the audit trail should say so.
      sourceName: guard.correction?.newName ?? base.sourceName,
    });
  }

  return { entries, review, corrections, alreadyHadImage };
}

/** Writes both output files and prints the summary a human reads before flipping `verified`. */
export function writeDeriveOutput<TRec extends CrawlRecord>(
  source: CardImageSource<TRec>,
  result: DeriveResult
): void {
  writeMappingFile<CardImageFile>(source.outDir, `${source.name}.json`, {
    gameId: "pokemon",
    sourceNote: source.sourceNote,
    entries: result.entries,
  });
  writeReviewFile<CardImageReviewFile>(source.outDir, `${source.name}.review.json`, {
    gameId: "pokemon",
    note: source.reviewNote,
    entries: result.review,
  });
  printDeriveSummary({
    mapped: result.entries.length,
    alreadyPopulated: result.alreadyHadImage,
    reviewed: result.review,
    outName: `${source.name}.json`,
    mappedSuffix: source.mappedSuffix?.(result),
    extraLines: source.extraLines?.(result),
  });
}

// ---------------------------------------------------------------------------
// crawl

/**
 * Opens a crawl cache, runs `body`, and guarantees the two things every crawl
 * stage has to get right: an abort leaves the cache closed and tells the
 * operator how to resume, and any other error still closes the handle.
 *
 * For crawlers whose fetch loop is interleaved with their own enumeration
 * (fetch a set's listing, then its cards, then the next set) and so can't be
 * expressed as the flat id list runIdCrawl takes.
 */
export async function withResumableCache<TRec extends CrawlRecord>(
  cacheName: string,
  body: (cache: CrawlCache<TRec>) => Promise<void>
): Promise<void> {
  const cache = openCrawlCache<TRec>(cacheName);
  try {
    await body(cache);
  } catch (err) {
    if (err instanceof CrawlAbortedError) {
      console.error(`\n${err.message}\nProgress is cached — rerun to resume.`);
    } else {
      throw err;
    }
  } finally {
    cache.close();
  }
  console.log(`Cached ${cache.seen.size} ids total.`);
}

export interface IdCrawlOptions<TRec extends CrawlRecord> {
  cacheName: string;
  /** Source ids to fetch. Anything already in the cache is skipped. */
  ids: number[];
  politeGet: ReturnType<typeof createPoliteFetcher>;
  url(id: number): string;
  /** Build the record to cache. Return null to cache nothing for this id. */
  record(id: number, res: { status: number; body: string }): TRec | null;
  /** Cached for a non-200 so the id counts as seen and isn't re-fetched. */
  emptyRecord(id: number, status: number): TRec;
  progressEvery?: number;
}

/**
 * The fetch loop shared by every detail-page crawler: skip what's cached,
 * fetch politely, append as we go, log progress, and on an abort say how to
 * resume rather than losing the run.
 *
 * Appending per record (rather than at the end) is deliberate — these crawls
 * run for hours and are going to be interrupted.
 */
export async function runIdCrawl<TRec extends CrawlRecord>(opts: IdCrawlOptions<TRec>): Promise<void> {
  const cache: CrawlCache<TRec> = openCrawlCache<TRec>(opts.cacheName);
  const todo = opts.ids.filter((id) => !cache.seen.has(id));
  const progressEvery = opts.progressEvery ?? 250;
  console.log(`${opts.ids.length} ids in range; ${todo.length} not yet cached.`);

  let done = 0;
  let hits = 0;
  try {
    for (const id of todo) {
      const res = await opts.politeGet(opts.url(id));
      if (res.status === 200) {
        const rec = opts.record(id, res);
        if (rec) {
          cache.append(rec);
          hits += 1;
        }
      } else {
        cache.append(opts.emptyRecord(id, res.status));
      }
      done += 1;
      if (done % progressEvery === 0) {
        console.log(`  ${done}/${todo.length} fetched (${hits} found)`);
      }
    }
  } catch (err) {
    if (err instanceof CrawlAbortedError) {
      console.error(`\n${err.message}\nProgress is cached — rerun to resume.`);
    } else {
      throw err;
    }
  } finally {
    cache.close();
  }
  console.log(`Done. ${hits} cards found this run; ${cache.seen.size} ids cached total.`);
}
