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
      // Don't fail the whole "add to portfolio" action over a pricing hiccup —
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
  const updated = await db.sportsCardItem.update({ where: { id }, data: { imageUrl } }).catch(() => null);
  return updated ? toDetail(updated) : null;
}
