// Cloudflare Workers deployment config for @opennextjs/cloudflare — see
// AGENTS.md's pointer to node_modules/next/dist/docs/ and Cloudflare's
// Next.js-on-Workers guide (developers.cloudflare.com/workers/frameworks/
// framework-guides/nextjs/) for the current adapter contract. Consumed by
// the "preview"/"deploy" scripts in package.json and by Cloudflare's
// "Workers Builds" git-integrated CI/CD (the "Workers Builds: cardstory"
// GitHub check). Cloudflare Workers is the primary (and only) deployment
// target — the site previously also ran on Vercel, but that config
// (vercel.json) has been removed; the daily price-snapshot cron it used
// to trigger now lives in workers/cron-snapshot/ instead.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// Persists Next's data/route cache (unstable_cache, fetch cache, ISR) in a
// Cloudflare KV namespace across requests/isolates — without this, the
// adapter's default cache lives only in a single isolate's memory and is
// lost on every cold start, so unstable_cache calls elsewhere in the app
// (see lib/catalog/search.ts, sets/[game]/page.tsx, card/[game]/[cardId]/
// page.tsx) would rarely actually hit. Requires a KV namespace bound as
// `NEXT_INC_CACHE_KV` in wrangler.jsonc (binding name is hardcoded by the
// override, see its BINDING_NAME export).
//
// This was tried once before and reverted — it tipped the gzip Worker
// bundle (3.69 MiB) over Cloudflare's 3 MiB free-plan cap. Now that the
// account is on the Workers Paid plan (10 MiB gzip cap), there's ample
// headroom and it's safe to re-enable.
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
