import Fuse from "fuse.js";
import { db } from "@/lib/db";
import type { ScanIdentification } from "@/lib/scan/gemini";

export interface ScanCandidate {
  catalogItemId: string;
  gameId: string;
  externalId: string;
  name: string;
  setName: string;
  number: string | null;
  imageSmallUrl: string | null;
  priceRaw: number | null;
}

/** Fuzzy-matches Gemini's read of the card against our own catalog. */
export async function matchCandidates(
  identification: ScanIdentification,
  limit = 5
): Promise<ScanCandidate[]> {
  if (!identification.cardName) return [];

  const where =
    identification.gameGuess && identification.gameGuess !== "other"
      ? { gameId: identification.gameGuess }
      : undefined;

  const items = await db.catalogItem.findMany({
    where,
    select: {
      id: true,
      gameId: true,
      externalId: true,
      name: true,
      number: true,
      imageSmallUrl: true,
      latestPriceRaw: true,
      set: { select: { name: true } },
    },
  });

  const fuse = new Fuse(items, {
    keys: [
      { name: "name", weight: 0.8 },
      { name: "number", weight: 0.2 },
    ],
    threshold: 0.45,
    includeScore: true,
  });

  const query = identification.cardNumber
    ? `${identification.cardName} ${identification.cardNumber}`
    : identification.cardName;

  return fuse
    .search(query)
    .slice(0, limit)
    .map((r) => ({
      catalogItemId: r.item.id,
      gameId: r.item.gameId,
      externalId: r.item.externalId,
      name: r.item.name,
      setName: r.item.set.name,
      number: r.item.number,
      imageSmallUrl: r.item.imageSmallUrl,
      priceRaw: r.item.latestPriceRaw != null ? Number(r.item.latestPriceRaw) : null,
    }));
}
