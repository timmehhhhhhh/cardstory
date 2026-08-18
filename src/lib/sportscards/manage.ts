import type { Sport } from "@prisma/client";
import { db } from "@/lib/db";
import { getSportsCardProductById } from "@/lib/pricing/sportscardspro/client";
import { mapPriceChartingProduct } from "@/lib/pricing/pricecharting/mapper";
import { upsertSportsCardPriceSnapshot } from "@/lib/pricing/sports-snapshot";

export interface SportsCardItemInput {
  /** If present, we trust the id over the free-text fields and re-fetch real data server-side. */
  priceChartingId?: string;
  sport: Sport;
  year?: number;
  /** Manufacturer, e.g. "Panini", "Topps", "Upper Deck". */
  distributor?: string;
  /** Just the product line, e.g. "Mosaic" — displayed as "[year] [distributor] [setName]". */
  setName: string;
  playerName: string;
  teamName?: string;
  cardNumber?: string;
  parallelName?: string;
  isAutograph?: boolean;
  isRelic?: boolean;
  serialLimit?: string;
  imageUrl?: string;
}

/**
 * Creates a SportsCardItem (or reuses an existing one matched to the same
 * SportsCardsPro product) and, when a priceChartingId is present, fetches
 * and records today's real price snapshot server-side — never trusting
 * client-supplied prices.
 */
export async function createOrReuseSportsCardItem(input: SportsCardItemInput): Promise<string> {
  if (input.priceChartingId) {
    const existing = await db.sportsCardItem.findUnique({
      where: { priceChartingId: input.priceChartingId },
    });
    if (existing) return existing.id;
  }

  const created = await db.sportsCardItem.create({
    data: {
      sport: input.sport,
      year: input.year,
      distributor: input.distributor,
      setName: input.setName,
      playerName: input.playerName,
      teamName: input.teamName,
      cardNumber: input.cardNumber,
      parallelName: input.parallelName,
      isAutograph: input.isAutograph ?? false,
      isRelic: input.isRelic ?? false,
      serialLimit: input.serialLimit,
      imageUrl: input.imageUrl,
      priceChartingId: input.priceChartingId,
    },
  });

  if (input.priceChartingId) {
    try {
      const product = await getSportsCardProductById(input.priceChartingId);
      if (product) {
        const values = mapPriceChartingProduct(product);
        await upsertSportsCardPriceSnapshot(db, created.id, values);
      }
    } catch (err) {
      // Don't fail the whole "add to PC" action over a pricing hiccup —
      // the item still gets created, just without a price yet.
      console.error("SportsCardsPro price fetch failed during create:", err);
    }
  }

  return created.id;
}

export interface SportsCardItemDetail {
  id: string;
  sport: Sport;
  year: number | null;
  distributor: string | null;
  setName: string;
  playerName: string;
  teamName: string | null;
  cardNumber: string | null;
  parallelName: string | null;
  isAutograph: boolean;
  isRelic: boolean;
  serialLimit: string | null;
  imageUrl: string | null;
  /** True when imageUrl is the checklist group's base-card photo, not a scan of this exact parallel. */
  imageIsInherited: boolean;
  priceRaw: number | null;
  priceChangePct: number | null;
}

function toDetail(r: {
  id: string;
  sport: Sport;
  year: number | null;
  distributor: string | null;
  setName: string;
  playerName: string;
  teamName: string | null;
  cardNumber: string | null;
  parallelName: string | null;
  isAutograph: boolean;
  isRelic: boolean;
  serialLimit: string | null;
  imageUrl: string | null;
  imageIsInherited: boolean;
  latestPriceRaw: unknown;
  priceChangePct: number | null;
}): SportsCardItemDetail {
  return {
    id: r.id,
    sport: r.sport,
    year: r.year,
    distributor: r.distributor,
    setName: r.setName,
    playerName: r.playerName,
    teamName: r.teamName,
    cardNumber: r.cardNumber,
    parallelName: r.parallelName,
    isAutograph: r.isAutograph,
    isRelic: r.isRelic,
    serialLimit: r.serialLimit,
    imageUrl: r.imageUrl,
    imageIsInherited: r.imageIsInherited,
    priceRaw: r.latestPriceRaw != null ? Number(r.latestPriceRaw) : null,
    priceChangePct: r.priceChangePct,
  };
}

export async function getSportsCardItemsByIds(ids: string[]): Promise<SportsCardItemDetail[]> {
  if (ids.length === 0) return [];
  const rows = await db.sportsCardItem.findMany({ where: { id: { in: ids } } });
  return rows.map(toDetail);
}

/** Currently only supports attaching/replacing an image — see /api/sportscards/[id]. */
export async function updateSportsCardImage(id: string, imageUrl: string): Promise<SportsCardItemDetail | null> {
  // A photo the owner attached themselves is of their actual copy, so it
  // sheds the "this is really the base card" watermark.
  const updated = await db.sportsCardItem
    .update({ where: { id }, data: { imageUrl, imageIsInherited: false } })
    .catch(() => null);
  return updated ? toDetail(updated) : null;
}

// ---------------------------------------------------------------------------
// Player checklists (e.g. "every LaMelo Ball card") — a bulk, hand-curated
// alternative to the ad hoc create-on-demand flow above. Every parallel of a
// checklist card gets its own real SportsCardItem row up front (same "one
// row per parallel" model the rest of this table already uses — see the
// schema comment on SportsCardItem), tagged with `cardType` so it's
// identifiable as checklist data rather than something a user typed in.
// Ownership is, as always, a separate client-side Holding — a row existing
// here never implies anyone owns it.
// ---------------------------------------------------------------------------

export type ChecklistCardType = "base" | "insert" | "short_print";

export interface ChecklistRowInput extends SportsCardItemInput {
  cardType: ChecklistCardType;
  imageBackUrl?: string;
  sourceUrl?: string;
  /** The product line's real street date — shared by every row in the same (year, distributor, setName), see scripts/data/lamelo-ball/release-dates.ts. */
  releaseDate?: Date;
}

/**
 * Deterministic natural key for a checklist row, so re-running a seed
 * script upserts instead of duplicating. Two rows are "the same card" iff
 * every identity field matches, including parallelName (so each parallel
 * gets its own key) AND cardType — a base card and a same-numbered
 * short-printed photo variation (e.g. 2020-21 Prizm #278 base vs. its
 * "Blue Uniform Photo Variation" SP) are genuinely different rows despite
 * sharing every other field. cardNumber/parallelName/cardType default to
 * "" rather than being left out so a later addition of any of them still
 * changes the key.
 */
export function computeExternalKey(input: {
  sport: Sport;
  year?: number;
  distributor?: string;
  setName: string;
  playerName: string;
  cardNumber?: string;
  parallelName?: string;
  cardType?: string;
}): string {
  return [
    input.sport,
    input.year ?? "",
    input.distributor ?? "",
    input.setName,
    input.playerName,
    input.cardNumber ?? "",
    input.parallelName ?? "",
    input.cardType ?? "",
  ]
    .join("|")
    .toLowerCase();
}

/**
 * Upserts one checklist row (a base card, an insert, an SP, or one specific
 * parallel of any of those) by its externalKey. Used by scripts/seed-*.ts —
 * never called from user-facing request handlers.
 *
 * Every optional field is normalized `undefined -> null` before hitting
 * Prisma: on an `update`, Prisma treats `undefined` as "leave this field
 * alone" rather than "clear it" — so if a re-seed removes a value that was
 * previously set (e.g. an imageUrl that turned out to be unreliable), an
 * un-normalized upsert would silently leave the stale value in place.
 */
export async function upsertChecklistSportsCardItem(input: ChecklistRowInput): Promise<string> {
  const externalKey = computeExternalKey(input);
  const data = {
    sport: input.sport,
    year: input.year ?? null,
    distributor: input.distributor ?? null,
    setName: input.setName,
    playerName: input.playerName,
    teamName: input.teamName ?? null,
    cardNumber: input.cardNumber ?? null,
    parallelName: input.parallelName ?? null,
    isAutograph: input.isAutograph ?? false,
    isRelic: input.isRelic ?? false,
    serialLimit: input.serialLimit ?? null,
    imageUrl: input.imageUrl ?? null,
    imageBackUrl: input.imageBackUrl ?? null,
    sourceUrl: input.sourceUrl ?? null,
    cardType: input.cardType,
    releaseDate: input.releaseDate ?? null,
    externalKey,
  };
  const row = await db.sportsCardItem.upsert({ where: { externalKey }, create: data, update: data });
  return row.id;
}

export interface ChecklistVariant {
  sportsCardItemId: string;
  /** "Base" when this row is the unparalleled version. */
  parallelName: string;
  serialLimit: string | null;
  /** Live unit market price, for stamping Holding.priceAtAcquisition when toggled owned. */
  priceRaw: number | null;
}

export interface ChecklistCard {
  /** Stable client-side grouping key: year|distributor|setName|cardNumber|cardType. */
  groupKey: string;
  year: number | null;
  distributor: string | null;
  setName: string;
  cardNumber: string | null;
  cardType: ChecklistCardType;
  imageUrl: string | null;
  imageBackUrl: string | null;
  sourceUrl: string | null;
  variants: ChecklistVariant[];
}

/**
 * Every checklist row for a player, grouped back into one card per
 * (year, distributor, setName, cardNumber, cardType) with its parallels
 * (including "Base" itself) as a flat list of ownable variants. The
 * front/back image and source live on the group, taken from whichever row
 * in the group has them set (normally the base row — see manage.ts's
 * upsertChecklistSportsCardItem callers in scripts/seed-lamelo-ball.ts).
 */
export async function getPlayerChecklist(sport: Sport, playerName: string): Promise<ChecklistCard[]> {
  const rows = await db.sportsCardItem.findMany({
    where: { sport, playerName, cardType: { not: null } },
    orderBy: [{ year: "asc" }, { distributor: "asc" }, { setName: "asc" }, { cardNumber: "asc" }],
  });

  const groups = new Map<string, ChecklistCard>();
  for (const r of rows) {
    const cardType = (r.cardType ?? "base") as ChecklistCardType;
    const groupKey = [r.year ?? "", r.distributor ?? "", r.setName, r.cardNumber ?? "", cardType].join("|");
    let group = groups.get(groupKey);
    if (!group) {
      group = {
        groupKey,
        year: r.year,
        distributor: r.distributor,
        setName: r.setName,
        cardNumber: r.cardNumber,
        cardType,
        imageUrl: null,
        imageBackUrl: null,
        sourceUrl: null,
        variants: [],
      };
      groups.set(groupKey, group);
    }
    if (r.imageUrl && !group.imageUrl) group.imageUrl = r.imageUrl;
    if (r.imageBackUrl && !group.imageBackUrl) group.imageBackUrl = r.imageBackUrl;
    if (r.sourceUrl && !group.sourceUrl) group.sourceUrl = r.sourceUrl;
    group.variants.push({
      sportsCardItemId: r.id,
      parallelName: r.parallelName && r.parallelName.length > 0 ? r.parallelName : "Base",
      serialLimit: r.serialLimit,
      priceRaw: r.latestPriceRaw != null ? Number(r.latestPriceRaw) : null,
    });
  }

  // "Base" first within each card, then everything else in seeded order.
  for (const g of groups.values()) {
    g.variants.sort((a, b) => (a.parallelName === "Base" ? -1 : b.parallelName === "Base" ? 1 : 0));
  }

  return [...groups.values()];
}
