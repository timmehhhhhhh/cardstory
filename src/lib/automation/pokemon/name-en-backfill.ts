/**
 * Recurring nameEn backfill — extracted from scripts/backfill-catalog-name-en.ts
 * + scripts/backfill-set-name-en.ts, merged into one chunked, cursor-based
 * job since both source from checked-in translation tables
 * (POKEMON_SET_TRANSLATIONS, species-based resolvePokemonCardNameEn) rather
 * than a network fetch. That makes this the cheapest cron leg — no
 * politeFetch pacing, no circuit breaker — so it can safely re-run daily
 * over the full non-English row set (chunked to stay comfortably under a
 * Worker request's time budget) and pick up rows that become resolvable
 * after a translation-table update or a new card crawl, with zero human
 * review step (a checked-in translation table is already a "safe,
 * deterministic" source — see scripts/backfill-catalog-name-en.ts's header).
 *
 * This is what makes a non-English Pokémon set/card searchable by its
 * English name (already wired into src/lib/catalog/search.ts) without
 * anyone re-running a script by hand.
 *
 * Unlike scripts/backfill-catalog-name-en.ts, this never writes the
 * scripts/data/*.review.json worklist (no filesystem under Cloudflare
 * Workers) — that file remains a manual-CLI-only artifact; run the original
 * script locally to regenerate it.
 */
import { db } from "@/lib/db";
import { resolvePokemonCardNameEn } from "@/lib/games/pokemon/card-name-en";
import { POKEMON_SET_TRANSLATIONS } from "../../../../scripts/data/pokemon-set-translations";
import { getCronCursor, recordCronSuccess } from "@/lib/automation/cron-job-state";

export const NAME_EN_BACKFILL_JOB_NAME = "pokemon-name-en-backfill";

interface NameEnBackfillCursor {
  /** "sets" runs first (cheap: one table, no derived candidate lookup), then "cards". */
  phase: "sets" | "cards";
  offset: number;
}

export interface NameEnBackfillSummary {
  phase: "sets" | "cards";
  rowsScanned: number;
  rowsUpdated: number;
  cursorWrapped: boolean;
}

export interface NameEnBackfillOptions {
  /** Rows scanned per invocation. Cheap (no network), so this can be generous. */
  chunkSize: number;
  jobName?: string;
}

async function backfillSetsChunk(offset: number, chunkSize: number) {
  const sets = await db.set.findMany({
    where: { gameId: "pokemon" },
    select: { id: true, code: true, nameEn: true },
    orderBy: { id: "asc" },
    skip: offset,
    take: chunkSize,
  });

  let updated = 0;
  for (const set of sets) {
    const translation = POKEMON_SET_TRANSLATIONS[set.code];
    if (!translation || set.nameEn === translation) continue;
    await db.set.update({ where: { id: set.id }, data: { nameEn: translation } });
    updated += 1;
  }
  return { scanned: sets.length, updated };
}

async function backfillCardsChunk(offset: number, chunkSize: number) {
  const items = await db.catalogItem.findMany({
    where: { gameId: "pokemon", language: { not: "EN" } },
    select: { id: true, name: true, nameEn: true, language: true },
    orderBy: { id: "asc" },
    skip: offset,
    take: chunkSize,
  });

  let updated = 0;
  for (const item of items) {
    const resolved = resolvePokemonCardNameEn(item.name, item.language);
    if (!resolved || item.nameEn === resolved) continue;
    await db.catalogItem.update({ where: { id: item.id }, data: { nameEn: resolved } });
    updated += 1;
  }
  return { scanned: items.length, updated };
}

export async function runNameEnBackfill(opts: NameEnBackfillOptions): Promise<NameEnBackfillSummary> {
  const jobName = opts.jobName ?? NAME_EN_BACKFILL_JOB_NAME;
  const cursor = (await getCronCursor<NameEnBackfillCursor>(jobName)) ?? { phase: "sets", offset: 0 };

  let phase = cursor.phase;
  let offset = cursor.offset;
  let cursorWrapped = false;

  const result =
    phase === "sets" ? await backfillSetsChunk(offset, opts.chunkSize) : await backfillCardsChunk(offset, opts.chunkSize);

  if (result.scanned < opts.chunkSize) {
    // Reached the end of this phase's table — move to the next phase (or
    // wrap back to the start of "sets" once "cards" also finishes).
    if (phase === "sets") {
      phase = "cards";
      offset = 0;
    } else {
      phase = "sets";
      offset = 0;
      cursorWrapped = true;
    }
  } else {
    offset += result.scanned;
  }

  await recordCronSuccess(
    jobName,
    { phase, offset },
    { phase: cursor.phase, rowsScanned: result.scanned, rowsUpdated: result.updated, cursorWrapped }
  );

  return { phase: cursor.phase, rowsScanned: result.scanned, rowsUpdated: result.updated, cursorWrapped };
}
