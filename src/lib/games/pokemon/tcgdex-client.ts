import type { UnifiedCard, UnifiedSet } from "@/lib/games/types";
import {
  mapTcgdexCard,
  mapTcgdexSet,
  type TcgdexCardBrief,
  type TcgdexCardDetail,
  type TcgdexLang,
  type TcgdexSetBrief,
  type TcgdexSetDetail,
} from "@/lib/games/pokemon/mapper";

const BASE_URL = "https://api.tcgdex.net/v2";
const TCGDEX_LANGS: TcgdexLang[] = ["ja", "zh-cn", "zh-tw", "ko"];
// Benchmarked at ~70 req/s against the live API with zero 429s at this
// concurrency — see the plan doc. Keeps a ~42k-card full-history pull to a
// background-friendly ~10-15 minutes of network time.
const CONCURRENCY = 25;

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    // Mirrors pokemon/client.ts's retry policy: tcgdex can transiently 5xx,
    // and a full-history pull is thousands of requests, so honor 429s too.
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 5) {
      const retryAfterMs = Number(res.headers.get("retry-after")) * 1000;
      const delay = Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : attempt * 500;
      await new Promise((r) => setTimeout(r, delay));
      return fetchJson<T>(url, attempt + 1);
    }
    throw new Error(`tcgdex request failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

/** Bounded-concurrency map — runs `fn` over `items` with at most `concurrency` in flight. */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

/**
 * Full /sets/{id} responses (releaseDate + brief card list), keyed by
 * "<lang>:<id>" (matching UnifiedSet.externalId). Populated by
 * fetchTcgdexSets() and reused by fetchTcgdexCardsForSet() within the same
 * process so a seed run doesn't fetch the same set detail twice.
 */
const setDetailCache = new Map<string, TcgdexSetDetail>();

/** All sets across every tcgdex-backed language, full set history (no cap). */
export async function fetchTcgdexSets(): Promise<UnifiedSet[]> {
  const out: UnifiedSet[] = [];
  for (const lang of TCGDEX_LANGS) {
    const briefs = await fetchJson<TcgdexSetBrief[]>(`${BASE_URL}/${lang}/sets`);
    const details = await mapWithConcurrency(briefs, CONCURRENCY, (b) =>
      fetchJson<TcgdexSetDetail>(`${BASE_URL}/${lang}/sets/${encodeURIComponent(b.id)}`)
    );
    for (const detail of details) {
      setDetailCache.set(`${lang}:${detail.id}`, detail);
      out.push(mapTcgdexSet(detail, lang));
    }
  }
  return out;
}

/** "ja:SV8" -> ["ja", "SV8"] — lang never contains ':', so splitting on the first one is safe. */
function splitLangPrefix(setExternalId: string): [TcgdexLang, string] {
  const idx = setExternalId.indexOf(":");
  return [setExternalId.slice(0, idx) as TcgdexLang, setExternalId.slice(idx + 1)];
}

export function isTcgdexSetExternalId(setExternalId: string): boolean {
  return TCGDEX_LANGS.some((lang) => setExternalId.startsWith(`${lang}:`));
}

/** Every card in one tcgdex set, fully enriched (rarity/illustrator/pricing) via bounded-concurrency fetch. */
export async function fetchTcgdexCardsForSet(setExternalId: string): Promise<UnifiedCard[]> {
  const [lang, id] = splitLangPrefix(setExternalId);
  const detail =
    setDetailCache.get(setExternalId) ??
    (await fetchJson<TcgdexSetDetail>(`${BASE_URL}/${lang}/sets/${encodeURIComponent(id)}`));

  const fullCards = await mapWithConcurrency<TcgdexCardBrief, TcgdexCardDetail | null>(
    detail.cards,
    CONCURRENCY,
    async (brief) => {
      try {
        return await fetchJson<TcgdexCardDetail>(
          `${BASE_URL}/${lang}/cards/${encodeURIComponent(brief.id)}`
        );
      } catch (err) {
        console.warn(`[pokemon:tcgdex] skipping card ${brief.id}:`, (err as Error).message);
        return null;
      }
    }
  );

  return fullCards
    .filter((c): c is TcgdexCardDetail => c != null)
    .map((c) => mapTcgdexCard(c, lang, setExternalId));
}
