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

// A KV-backed incremental cache (persisting unstable_cache/fetch-cache/ISR
// across requests and isolates, not just within one warm isolate) was tried
// here but reverted: it tipped the deployed Worker over Cloudflare's 3 MiB
// gzip free-plan cap (see the "Workers Builds: cardstory" check on the PR
// that added it) — this app's bundle already sits close to that cap from
// Prisma's WASM engine (see lib/db.ts's comments) plus the Gemini/recharts/
// cheerio dependencies, leaving little headroom for new bundle surface.
// unstable_cache calls elsewhere in the app (lib/catalog/search.ts,
// sets/[game]/page.tsx, card/[game]/[cardId]/page.tsx) still help within a
// single warm isolate via the adapter's default in-memory cache; revisit
// KV once there's a plan for trimming the base bundle first.
export default defineCloudflareConfig();
