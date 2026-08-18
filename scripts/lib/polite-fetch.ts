/**
 * A deliberately slow, single-threaded HTTP GET for the one-off image
 * backfill crawls (scripts/crawl-pokemon-*-images.ts).
 *
 * These crawls hit the official Pokémon publisher sites tens of thousands of
 * times, so the priority is being a well-behaved guest rather than finishing
 * fast: one request at a time, ~0.55 req/s, Retry-After honored, and a
 * circuit breaker so a site that starts refusing us stops the run instead of
 * hammering it into a ban. Throttle shape mirrors lib/pricing/ebay/client.ts;
 * retry policy mirrors lib/games/pokemon/tcgdex-client.ts.
 *
 * Run from a dev machine only — never from a request handler or a cron.
 */

const DEFAULT_MIN_INTERVAL_MS = 1200;
const DEFAULT_JITTER_MS = 600;
const MAX_ATTEMPTS = 5;

/**
 * Truthful and contactable, deliberately not a spoofed Chrome string. If a
 * site wants to refuse this crawler it should be able to; pretending to be a
 * browser to get around that is how you end up hard-blocked like
 * sportscardspro.com already does.
 */
const USER_AGENT =
  "CardStoryImageBackfill/1.0 (one-off catalog image backfill; contact via repo)";

/** Single shared clock — every crawl in a process queues behind it. */
let lastCallAt = 0;

async function throttle(minIntervalMs: number, jitterMs: number) {
  const wait = lastCallAt + minIntervalMs - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now() + Math.floor(Math.random() * jitterMs);
}

export class CrawlAbortedError extends Error {}

/** Trips the run when a host starts refusing us, instead of grinding on. */
class CircuitBreaker {
  private consecutiveForbidden = 0;
  private consecutiveUnexpected = 0;

  record(status: number) {
    if (status === 403 || status === 429) {
      this.consecutiveForbidden += 1;
      if (this.consecutiveForbidden >= 3) {
        throw new CrawlAbortedError(
          `Circuit breaker: 3 consecutive ${status} responses. The host is refusing this crawler — stop, do not retry in a loop.`
        );
      }
    } else {
      this.consecutiveForbidden = 0;
    }

    // 2xx is a hit, 3xx is this-id-does-not-exist — both are expected traffic.
    if (status >= 200 && status < 400) {
      this.consecutiveUnexpected = 0;
    } else {
      this.consecutiveUnexpected += 1;
      if (this.consecutiveUnexpected >= 5) {
        throw new CrawlAbortedError(
          `Circuit breaker: 5 consecutive unexpected responses (last ${status}).`
        );
      }
    }
  }
}

export interface PoliteFetchOptions {
  minIntervalMs?: number;
  jitterMs?: number;
  method?: "GET" | "HEAD";
}

export interface PoliteResponse {
  status: number;
  /** Empty for redirects and HEAD requests. */
  body: string;
}

export function createPoliteFetcher(opts: PoliteFetchOptions = {}) {
  const minIntervalMs = opts.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  const jitterMs = opts.jitterMs ?? DEFAULT_JITTER_MS;
  const method = opts.method ?? "GET";
  const breaker = new CircuitBreaker();

  return async function politeGet(url: string, attempt = 1): Promise<PoliteResponse> {
    await throttle(minIntervalMs, jitterMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        // Load-bearing: pokemon-card.com answers a non-existent card id with a
        // 302 to its search page. Following that would turn "no such card"
        // into a 200 full of some other page's markup and silently poison the
        // derived mapping.
        redirect: "manual",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "Accept-Language": "ja,zh-TW,en;q=0.8",
        },
      });
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 1000));
        return politeGet(url, attempt + 1);
      }
      throw err;
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < MAX_ATTEMPTS) {
      const retryAfterMs = Number(res.headers.get("retry-after")) * 1000;
      const delay =
        Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : attempt * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return politeGet(url, attempt + 1);
    }

    breaker.record(res.status);

    const body = res.status >= 200 && res.status < 300 && method === "GET" ? await res.text() : "";
    return { status: res.status, body };
  };
}
