import type { GameProvider, UnifiedCard, UnifiedSet } from "@/lib/games/types";
import { mapFabCardsForSet, mapFabSet, type GoagainApiCard, type GoagainApiSet } from "@/lib/games/fab/mapper";

const BASE_URL = "https://api.goagain.dev/v1";

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    // No documented rate limit, but same retry-on-transient-failure courtesy
    // as the Pokémon/Riftbound clients.
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

/**
 * FAB has ~120 sets spanning its whole retail history — actually seeding all
 * of it is a much bigger job than this provider takes on. Scoped deliberately
 * to just the promo sets (every set whose official name contains "Promo":
 * Convention, GEM Pack, Hero Card, Judge Unique, Local Game Store, LSS, and
 * Slingshot Underground Promos, plus the evergreen "Promos" set itself) so
 * `npx tsx scripts/seed-catalog.ts fab` seeds every promo FAB has ever
 * printed. Derived from the live set list rather than a hardcoded id
 * allowlist so a newly-introduced promo line picks itself up automatically.
 */
async function fetchSets(): Promise<UnifiedSet[]> {
  const sets = await fetchJson<GoagainApiSet[]>(`${BASE_URL}/sets`);
  return sets
    .filter((s) => s.name.toLowerCase().includes("promo"))
    .map(mapFabSet)
    .sort((a, b) => (b.releaseDate?.getTime() ?? 0) - (a.releaseDate?.getTime() ?? 0));
}

async function fetchCardsForSet(setExternalId: string): Promise<UnifiedCard[]> {
  // `/sets/{id}` embeds the full card list (with every printing of each
  // card, across every set) — no separate paginated cards call needed.
  const set = await fetchJson<GoagainApiSet & { cards: GoagainApiCard[] }>(
    `${BASE_URL}/sets/${encodeURIComponent(setExternalId)}`
  );
  return mapFabCardsForSet(set.cards, setExternalId);
}

export const fabProvider: GameProvider = {
  gameId: "fab",
  fetchSets,
  fetchCardsForSet,
};
