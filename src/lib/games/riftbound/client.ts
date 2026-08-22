import type { GameProvider, UnifiedCard, UnifiedSet } from "@/lib/games/types";
import {
  mapRiftboundCard,
  mapRiftboundSet,
  type RiftcodexApiCard,
  type RiftcodexApiSet,
} from "@/lib/games/riftbound/mapper";

const BASE_URL = "https://api.riftcodex.com";

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    // Same retry-on-transient-failure treatment as the Pokémon client —
    // no documented rate limit, but be a good citizen of a free community API.
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 5) {
      const retryAfterMs = Number(res.headers.get("retry-after")) * 1000;
      const delay = Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : attempt * 500;
      await new Promise((r) => setTimeout(r, delay));
      return fetchJson<T>(url, attempt + 1);
    }
    throw new Error(`riftcodex.com request failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

async function fetchSets(): Promise<UnifiedSet[]> {
  const json = await fetchJson<{ items: RiftcodexApiSet[] }>(`${BASE_URL}/sets?page=1&size=50`);
  return json.items
    .slice()
    .sort((a, b) => (b.published_on ?? "").localeCompare(a.published_on ?? ""))
    .map(mapRiftboundSet);
}

async function fetchCardsForSet(setExternalId: string): Promise<UnifiedCard[]> {
  const cards: UnifiedCard[] = [];
  // riftcodex.com's /cards pagination isn't reliable for larger sets: the
  // same riftbound_id (e.g. every OPP/VEN promo reprint) can come back on
  // more than one page. Riftbound has no real card-variant concept (unlike
  // Pokémon's finish/language variants — see mapPokemonCardVariants), so
  // every riftbound_id is meant to identify exactly one printing; a repeat
  // is always a duplicate from the API, never a second variant. Drop it
  // here rather than letting it flow into seed-catalog.ts's primary/variant
  // dedup logic, which would otherwise treat the repeat as a distinct
  // variant and violate the (gameId, externalId, variantKey) unique index.
  const seenIds = new Set<string>();
  let page = 1;
  let duplicateCount = 0;
  const size = 100; // riftcodex.com caps `size` at 100/page.
  for (;;) {
    const json = await fetchJson<{ items: RiftcodexApiCard[]; total: number; pages: number }>(
      `${BASE_URL}/cards?set_id=${encodeURIComponent(setExternalId.toUpperCase())}&page=${page}&size=${size}`
    );
    for (const raw of json.items) {
      if (seenIds.has(raw.riftbound_id)) {
        duplicateCount += 1;
        continue;
      }
      seenIds.add(raw.riftbound_id);
      cards.push(mapRiftboundCard(raw, setExternalId));
    }
    if (page >= json.pages || json.items.length === 0) break;
    page += 1;
  }
  if (duplicateCount > 0) {
    console.warn(
      `[riftbound] set ${setExternalId}: dropped ${duplicateCount} duplicate riftbound_id row(s) returned by the API's pagination.`
    );
  }
  return cards;
}

export const riftboundProvider: GameProvider = {
  gameId: "riftbound",
  fetchSets,
  fetchCardsForSet,
};
