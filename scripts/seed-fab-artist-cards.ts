/**
 * FAB's provider (see lib/games/fab/client.ts) deliberately only seeds promo
 * sets — seeding FAB's full ~120-set retail history is out of scope for the
 * regular catalog seed. But an artist's body of work isn't confined to promo
 * sets, so this is a narrow, artist-scoped alternative: it walks every FAB
 * set (not just promos), keeps only the cards illustrated by the given
 * artist, and upserts just those — plus whichever sets they live in — into
 * the catalog. Everything else in those sets is left unseeded.
 *
 * Run with: npx tsx scripts/seed-fab-artist-cards.ts "MJ Fetesio"
 */
import { PrismaClient } from "@prisma/client";
import { mapFabCardsForSet, mapFabSet, type GoagainApiCard, type GoagainApiSet } from "@/lib/games/fab/mapper";

const BASE_URL = "https://api.goagain.dev/v1";

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 5) {
      const retryAfterMs = Number(res.headers.get("retry-after")) * 1000;
      const delay = Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : attempt * 500;
      await new Promise((r) => setTimeout(r, delay));
      return fetchJson<T>(url, attempt + 1);
    }
    throw new Error(`api.goagain.dev request failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

const db = new PrismaClient();

async function main() {
  const artist = process.argv[2];
  if (!artist) {
    throw new Error('Usage: npx tsx scripts/seed-fab-artist-cards.ts "Artist Name"');
  }
  const needle = artist.toLowerCase();

  console.log(`[fab] fetching full set list…`);
  const allSets = await fetchJson<GoagainApiSet[]>(`${BASE_URL}/sets`);
  console.log(`[fab] scanning ${allSets.length} sets for cards illustrated by "${artist}"…`);

  let setsSeeded = 0;
  let cardsSeeded = 0;

  for (const [i, rawSet] of allSets.entries()) {
    const full = await fetchJson<GoagainApiSet & { cards: GoagainApiCard[] }>(
      `${BASE_URL}/sets/${encodeURIComponent(rawSet.id)}`
    );
    const cards = mapFabCardsForSet(full.cards, rawSet.id).filter((c) =>
      (c.artist ?? "").toLowerCase().includes(needle)
    );

    if (cards.length > 0) {
      const setId = `fab:${rawSet.id.toLowerCase()}`;
      const set = mapFabSet(rawSet);
      await db.set.upsert({
        where: { id: setId },
        create: {
          id: setId,
          gameId: "fab",
          name: set.name,
          code: set.code,
          releaseDate: set.releaseDate,
          symbolUrl: set.symbolUrl,
          cardCount: set.cardCount,
        },
        update: {
          name: set.name,
          releaseDate: set.releaseDate,
          symbolUrl: set.symbolUrl,
          cardCount: set.cardCount,
        },
      });
      setsSeeded += 1;

      for (const card of cards) {
        const catalogItemId = `fab:${card.externalId}`;
        await db.catalogItem.upsert({
          where: { id: catalogItemId },
          create: {
            id: catalogItemId,
            gameId: "fab",
            setId,
            externalId: card.externalId,
            name: card.name,
            number: card.number,
            rarity: card.rarity,
            artist: card.artist,
            cardType: card.cardType,
            imageSmallUrl: card.imageSmallUrl,
            imageLargeUrl: card.imageLargeUrl,
            productType: card.productType,
            language: card.language,
          },
          update: {
            name: card.name,
            number: card.number,
            rarity: card.rarity,
            artist: card.artist,
            cardType: card.cardType,
            imageSmallUrl: card.imageSmallUrl,
            imageLargeUrl: card.imageLargeUrl,
          },
        });
        cardsSeeded += 1;
        console.log(`[fab] (${i + 1}/${allSets.length}) ${rawSet.id}: ${card.name} (${card.number})`);
      }
    }
  }

  console.log(`\n[fab] done — ${cardsSeeded} card(s) by "${artist}" across ${setsSeeded} set(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
