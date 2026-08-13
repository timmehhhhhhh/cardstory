import type { GameProvider, UnifiedCard, UnifiedSet } from "@/lib/games/types";
import {
  mapScryfallCard,
  mapScryfallSet,
  SCRYFALL_SEEDABLE_SET_TYPES,
  type ScryfallCard,
  type ScryfallSet,
} from "@/lib/games/mtg/mapper";

const BASE_URL = "https://api.scryfall.com";

// Scryfall has no API key (and none is possible) but asks that clients
// identify themselves with a descriptive User-Agent + Accept header.
function headers(): HeadersInit {
  return {
    "User-Agent": "CardStory/0.1 (github.com/cardstory; card portfolio tracker demo)",
    Accept: "application/json",
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(`Scryfall request failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

async function fetchSets(): Promise<UnifiedSet[]> {
  const json = await fetchJson<{ data: ScryfallSet[] }>(`${BASE_URL}/sets`);
  return json.data
    .filter((s) => SCRYFALL_SEEDABLE_SET_TYPES.has(s.set_type))
    .filter((s) => !s.released_at || new Date(s.released_at) <= new Date())
    .sort((a, b) => (b.released_at ?? "").localeCompare(a.released_at ?? ""))
    .map(mapScryfallSet);
}

async function fetchCardsForSet(setExternalId: string): Promise<UnifiedCard[]> {
  const cards: UnifiedCard[] = [];
  let url:
    | string
    | undefined = `${BASE_URL}/cards/search?order=set&unique=prints&q=${encodeURIComponent(
    `e:${setExternalId}`
  )}`;

  while (url) {
    const json: { data: ScryfallCard[]; has_more: boolean; next_page?: string } =
      await fetchJson(url);
    cards.push(...json.data.map((c) => mapScryfallCard(c, setExternalId)));
    url = json.has_more ? json.next_page : undefined;
    // Scryfall etiquette: ~50-100ms between requests when paginating.
    if (url) await new Promise((r) => setTimeout(r, 100));
  }
  return cards;
}

export const mtgProvider: GameProvider = {
  gameId: "mtg",
  fetchSets,
  fetchCardsForSet,
};
