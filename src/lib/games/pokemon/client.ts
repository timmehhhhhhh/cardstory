import type { GameProvider, UnifiedCard, UnifiedSet } from "@/lib/games/types";
import { mapPokemonCard, mapPokemonSet, type PokemonApiCard, type PokemonApiSet } from "@/lib/games/pokemon/mapper";

const BASE_URL = "https://api.pokemontcg.io/v2";

function headers(): HeadersInit {
  const key = process.env.POKEMONTCG_API_KEY;
  return key ? { "X-Api-Key": key } : {};
}

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    // pokemontcg.io occasionally 500s transiently on specific set queries;
    // a couple of retries with backoff clears most of them.
    if (res.status >= 500 && attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * 500));
      return fetchJson<T>(url, attempt + 1);
    }
    throw new Error(`pokemontcg.io request failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

async function fetchSets(): Promise<UnifiedSet[]> {
  const json = await fetchJson<{ data: PokemonApiSet[] }>(
    `${BASE_URL}/sets?orderBy=-releaseDate`
  );
  return json.data.map(mapPokemonSet);
}

async function fetchCardsForSet(setExternalId: string): Promise<UnifiedCard[]> {
  const cards: UnifiedCard[] = [];
  let page = 1;
  const pageSize = 250;
  // pokemontcg.io paginates at 250/page max; most sets fit in 1-2 pages.
  for (;;) {
    const json = await fetchJson<{ data: PokemonApiCard[]; count: number; totalCount: number }>(
      `${BASE_URL}/cards?q=set.id:${encodeURIComponent(setExternalId)}&page=${page}&pageSize=${pageSize}`
    );
    cards.push(...json.data.map((c) => mapPokemonCard(c, setExternalId)));
    if (page * pageSize >= json.totalCount || json.data.length === 0) break;
    page += 1;
  }
  return cards;
}

export const pokemonProvider: GameProvider = {
  gameId: "pokemon",
  fetchSets,
  fetchCardsForSet,
};
