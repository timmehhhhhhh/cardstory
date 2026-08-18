import type { GameProvider, UnifiedCard, UnifiedSet } from "@/lib/games/types";
import {
  mapPokemonCardVariants,
  mapPokemonSet,
  type PokemonApiCard,
  type PokemonApiSet,
} from "@/lib/games/pokemon/mapper";
import {
  fetchTcgdexCardsForSet,
  fetchTcgdexSets,
  isTcgdexSetExternalId,
} from "@/lib/games/pokemon/tcgdex-client";

const BASE_URL = "https://api.pokemontcg.io/v2";

function headers(): HeadersInit {
  const key = process.env.POKEMONTCG_API_KEY;
  return key ? { "X-Api-Key": key } : {};
}

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    // pokemontcg.io occasionally 500s transiently on specific set queries,
    // and a full-catalog pull (~300 sequential requests) can also trip its
    // rate limit (429) — retry both, honoring Retry-After when given.
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 5) {
      const retryAfterMs = Number(res.headers.get("retry-after")) * 1000;
      const delay = Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : attempt * 500;
      await new Promise((r) => setTimeout(r, delay));
      return fetchJson<T>(url, attempt + 1);
    }
    throw new Error(`pokemontcg.io request failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

/**
 * English sets from pokemontcg.io plus Japanese/Chinese(Simplified)/
 * Chinese(Traditional)/Korean sets from tcgdex.net (pokemontcg.io has no
 * non-English data) — see tcgdex-client.ts for that side.
 *
 * Fetched independently via allSettled rather than Promise.all: pokemontcg.io
 * is the one known to "occasionally 500 transiently" (see fetchJson above),
 * and a Promise.all would let that flakiness take the unrelated tcgdex sets
 * down with it. Only throws if BOTH sources fail.
 */
async function fetchSets(): Promise<UnifiedSet[]> {
  const [enResult, tcgdexResult] = await Promise.allSettled([
    fetchJson<{ data: PokemonApiSet[] }>(`${BASE_URL}/sets?orderBy=-releaseDate`).then((json) =>
      json.data.map(mapPokemonSet)
    ),
    fetchTcgdexSets(),
  ]);

  if (enResult.status === "rejected") console.warn("[pokemon] English sets failed:", enResult.reason);
  if (tcgdexResult.status === "rejected") console.warn("[pokemon] tcgdex sets failed:", tcgdexResult.reason);
  if (enResult.status === "rejected" && tcgdexResult.status === "rejected") {
    throw new Error("[pokemon] both pokemontcg.io and tcgdex set fetches failed");
  }

  return [
    ...(enResult.status === "fulfilled" ? enResult.value : []),
    ...(tcgdexResult.status === "fulfilled" ? tcgdexResult.value : []),
  ];
}

async function fetchCardsForSet(setExternalId: string): Promise<UnifiedCard[]> {
  // tcgdex-backed sets are tagged "<lang>:<id>" (see tcgdex-client.ts);
  // pokemontcg.io's own ids never contain ':', so this dispatch is unambiguous.
  if (isTcgdexSetExternalId(setExternalId)) {
    return fetchTcgdexCardsForSet(setExternalId);
  }

  const cards: UnifiedCard[] = [];
  let page = 1;
  const pageSize = 250;
  // pokemontcg.io paginates at 250/page max; most sets fit in 1-2 pages.
  for (;;) {
    const json = await fetchJson<{ data: PokemonApiCard[]; count: number; totalCount: number }>(
      `${BASE_URL}/cards?q=set.id:${encodeURIComponent(setExternalId)}&page=${page}&pageSize=${pageSize}`
    );
    cards.push(...json.data.flatMap((c) => mapPokemonCardVariants(c, setExternalId)));
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
