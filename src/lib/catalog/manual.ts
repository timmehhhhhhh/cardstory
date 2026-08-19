import type { ProductType } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Manual overrides for CatalogItem/Set rows that have no bulk-API source —
 * e.g. real cards the live provider (tcgdex.net, pokemontcg.io, ...) simply
 * doesn't carry. Mirrors the hand-curated pattern already used for sports
 * cards (upsertChecklistSportsCardItem in lib/sportscards/manage.ts), but
 * for the shared Game-catalog tables instead of SportsCardItem. Called only
 * from scripts/seed-*.ts — never from user-facing request handlers.
 */

export interface ManualSetInput {
  setId: string;
  gameId: string;
  name: string;
  code: string;
  releaseDate?: Date;
  symbolUrl?: string;
  logoUrl?: string;
  cardCount?: number;
}

/**
 * Creates the Set row only if it doesn't already exist. Deliberately a
 * no-op `update` — a manual data file only knows enough about the set to
 * reference it, not to be authoritative about its metadata, so it must
 * never clobber what the real provider-driven seed (scripts/seed-catalog.ts)
 * already wrote (symbolUrl, true cardCount, etc.).
 */
export async function upsertManualSet(input: ManualSetInput): Promise<void> {
  await db.set.upsert({
    where: { id: input.setId },
    create: {
      id: input.setId,
      gameId: input.gameId,
      name: input.name,
      code: input.code,
      releaseDate: input.releaseDate ?? null,
      symbolUrl: input.symbolUrl ?? null,
      logoUrl: input.logoUrl ?? null,
      cardCount: input.cardCount ?? null,
    },
    update: {},
  });
}

export interface ManualCatalogItemInput {
  id: string;
  gameId: string;
  setId: string;
  externalId: string;
  name: string;
  /** English name of this printing, when known — see CatalogItem.nameEn. */
  nameEn?: string;
  number?: string;
  rarity?: string;
  artist?: string;
  cardType?: string;
  imageSmallUrl?: string;
  imageLargeUrl?: string;
  productType?: ProductType;
  language: string;
}

/**
 * Upserts one hand-curated CatalogItem row. Unlike upsertManualSet, this
 * `update` is the full data object — manual entries are hand-verified and
 * meant to be fully authoritative on every re-run. Every optional field is
 * normalized `undefined -> null` first: Prisma treats `undefined` as "leave
 * this field alone" on update, which would leak stale values across
 * re-seeds (same reasoning as upsertChecklistSportsCardItem in
 * lib/sportscards/manage.ts).
 */
export async function upsertManualCatalogItem(input: ManualCatalogItemInput): Promise<void> {
  const data = {
    gameId: input.gameId,
    setId: input.setId,
    externalId: input.externalId,
    name: input.name,
    nameEn: input.nameEn ?? null,
    number: input.number ?? null,
    rarity: input.rarity ?? null,
    artist: input.artist ?? null,
    cardType: input.cardType ?? null,
    imageSmallUrl: input.imageSmallUrl ?? null,
    imageLargeUrl: input.imageLargeUrl ?? null,
    productType: input.productType ?? "CARD",
    language: input.language,
  } as const;

  await db.catalogItem.upsert({
    where: { id: input.id },
    create: { id: input.id, ...data },
    update: data,
  });
}
