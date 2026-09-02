/**
 * Incremental catalog sync — the cron-scheduled counterpart to
 * scripts/seed-catalog.ts's full reseed, extracted from that script's
 * `seedGame`/`upsertGames` logic.
 *
 * "Incremental" means: Set metadata is upserted for every set the provider
 * reports (cheap — one row each, no card fetch), but a set's cards are only
 * fetched when that set is NEW (no existing Set row yet) or GREW (the
 * provider's cardCount is now higher than what's already stored) — an
 * unchanged existing set costs nothing beyond its one metadata upsert. This
 * is what lets brand-new Pokémon sets/cards get picked up automatically:
 * `pokemon-catalog-sync` runs nightly and any newly-announced/released set
 * shows up as "new" on the very next run.
 *
 * Bounded by `maxSetsPerRun` + a CronJobState cursor (see
 * src/lib/automation/cron-job-state.ts) so a big new-set wave (several sets
 * releasing close together) spreads across multiple nightly runs instead of
 * blowing one request's time budget. scripts/seed-catalog.ts is deliberately
 * left as its own standalone script rather than becoming a thin wrapper
 * around this module — see that script's own header comment for why.
 */
import { db } from "@/lib/db";
import { GAMES, GAME_PROVIDERS } from "@/lib/games/registry";
import { upsertPriceSnapshot } from "@/lib/pricing/snapshot";
import { getCronCursor, recordCronSuccess } from "@/lib/automation/cron-job-state";
import type { UnifiedSet } from "@/lib/games/types";

export const CATALOG_SYNC_JOB_NAME = "pokemon-catalog-sync";

export interface CatalogSyncOptions {
  gameIds: string[];
  /** Caps how many sets get their cards (re-)fetched in one call. `Infinity` disables bounding entirely (every set is processed every call). */
  maxSetsPerRun: number;
  jobName?: string;
}

interface CatalogSyncCursor {
  gameIndex: number;
  setIndex: number;
}

export interface CatalogSyncSummary {
  gameIds: string[];
  setsUpserted: number;
  setsWithCardsSynced: number;
  setsUpToDate: number;
  cardsUpserted: number;
  pricedSnapshots: number;
  cursorWrapped: boolean;
}

async function upsertGames(): Promise<void> {
  for (const g of GAMES) {
    await db.game.upsert({
      where: { id: g.id },
      create: { id: g.id, name: g.name, logoUrl: g.shortLabel, status: g.status, sortOrder: g.sortOrder },
      update: { name: g.name, logoUrl: g.shortLabel, status: g.status, sortOrder: g.sortOrder },
    });
  }
}

async function upsertSetMetadata(gameId: string, setId: string, set: UnifiedSet): Promise<void> {
  await db.set.upsert({
    where: { id: setId },
    create: {
      id: setId,
      gameId,
      name: set.name,
      nameEn: set.nameEn ?? null,
      code: set.code,
      releaseDate: set.releaseDate,
      symbolUrl: set.symbolUrl,
      logoUrl: set.logoUrl,
      cardCount: set.cardCount,
    },
    update: {
      name: set.name,
      // `undefined` (not `set.nameEn ?? null`) so a sync never clobbers a
      // translation the name-en backfill already wrote for a code this
      // provider run doesn't carry one for — same convention as
      // scripts/seed-catalog.ts.
      nameEn: set.nameEn,
      releaseDate: set.releaseDate,
      symbolUrl: set.symbolUrl,
      logoUrl: set.logoUrl,
      cardCount: set.cardCount,
    },
  });
}

/** Same card-upsert loop as scripts/seed-catalog.ts's `seedGame` inner loop. */
async function syncCardsForSet(
  gameId: string,
  setId: string,
  set: UnifiedSet
): Promise<{ cards: number; priced: number }> {
  const provider = GAME_PROVIDERS[gameId];
  let cards;
  try {
    cards = await provider.fetchCardsForSet(set.externalId);
  } catch (err) {
    console.warn(`[${gameId}] skipping ${set.code} after repeated fetch failures:`, (err as Error).message);
    return { cards: 0, priced: 0 };
  }

  let cardCount = 0;
  let priced = 0;
  const seenExternalIds = new Set<string>();
  for (const card of cards) {
    const isPrimary = !seenExternalIds.has(card.externalId);
    seenExternalIds.add(card.externalId);
    const catalogItemId = isPrimary
      ? `${gameId}:${card.externalId}`
      : `${gameId}:${card.externalId}:${card.variantKey}`;
    await db.catalogItem.upsert({
      where: { id: catalogItemId },
      create: {
        id: catalogItemId,
        gameId,
        setId,
        externalId: card.externalId,
        variantKey: card.variantKey ?? "",
        name: card.name,
        nameEn: card.nameEn ?? null,
        number: card.number,
        rarity: card.rarity,
        artist: card.artist,
        cardType: card.cardType,
        domain: card.domain ?? [],
        nationalPokedexNumbers: card.nationalPokedexNumbers ?? [],
        imageSmallUrl: card.imageSmallUrl,
        imageLargeUrl: card.imageLargeUrl,
        productType: card.productType,
        language: card.language,
      },
      update: {
        name: card.name,
        // `undefined`, same reasoning as upsertSetMetadata's nameEn above.
        nameEn: card.nameEn,
        number: card.number,
        rarity: card.rarity,
        artist: card.artist,
        cardType: card.cardType,
        domain: card.domain ?? [],
        nationalPokedexNumbers: card.nationalPokedexNumbers ?? [],
        imageSmallUrl: card.imageSmallUrl,
        imageLargeUrl: card.imageLargeUrl,
      },
    });
    cardCount += 1;
    if (card.price) {
      await upsertPriceSnapshot(db, catalogItemId, card.price);
      priced += 1;
    }
  }
  return { cards: cardCount, priced };
}

export async function runCatalogSync(opts: CatalogSyncOptions): Promise<CatalogSyncSummary> {
  const jobName = opts.jobName ?? CATALOG_SYNC_JOB_NAME;

  for (const gameId of opts.gameIds) {
    if (!GAME_PROVIDERS[gameId]) {
      throw new Error(`Unknown or unwired gameId "${gameId}". Wired games: ${Object.keys(GAME_PROVIDERS).join(", ")}`);
    }
  }

  await upsertGames();

  const setsByGame = new Map<string, UnifiedSet[]>();
  for (const gameId of opts.gameIds) {
    setsByGame.set(gameId, await GAME_PROVIDERS[gameId].fetchSets());
  }

  const savedCursor = await getCronCursor<CatalogSyncCursor>(jobName);
  let gameIndex = savedCursor?.gameIndex ?? 0;
  let setIndex = savedCursor?.setIndex ?? 0;
  if (gameIndex >= opts.gameIds.length) {
    gameIndex = 0;
    setIndex = 0;
  }

  let setsUpserted = 0;
  let setsWithCardsSynced = 0;
  let setsUpToDate = 0;
  let cardsUpserted = 0;
  let pricedSnapshots = 0;

  outer: while (gameIndex < opts.gameIds.length) {
    const gameId = opts.gameIds[gameIndex];
    const sets = setsByGame.get(gameId)!;

    while (setIndex < sets.length) {
      if (setsWithCardsSynced >= opts.maxSetsPerRun) break outer;

      const set = sets[setIndex];
      const setId = `${gameId}:${set.code}`;
      const existing = await db.set.findUnique({ where: { id: setId }, select: { cardCount: true } });
      await upsertSetMetadata(gameId, setId, set);
      setsUpserted += 1;

      const isNew = !existing;
      const grew = existing?.cardCount != null && set.cardCount != null && set.cardCount > existing.cardCount;
      if (isNew || grew || !Number.isFinite(opts.maxSetsPerRun)) {
        const { cards, priced } = await syncCardsForSet(gameId, setId, set);
        cardsUpserted += cards;
        pricedSnapshots += priced;
        setsWithCardsSynced += 1;
      } else {
        setsUpToDate += 1;
      }
      setIndex += 1;
    }
    gameIndex += 1;
    setIndex = 0;
  }

  const cursorWrapped = gameIndex >= opts.gameIds.length;
  if (cursorWrapped) {
    gameIndex = 0;
    setIndex = 0;
  }

  await recordCronSuccess(
    jobName,
    { gameIndex, setIndex },
    { setsUpserted, setsWithCardsSynced, setsUpToDate, cardsUpserted, pricedSnapshots, cursorWrapped }
  );

  return {
    gameIds: opts.gameIds,
    setsUpserted,
    setsWithCardsSynced,
    setsUpToDate,
    cardsUpserted,
    pricedSnapshots,
    cursorWrapped,
  };
}
