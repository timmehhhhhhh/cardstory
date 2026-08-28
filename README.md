# CardStory

A clone of [app.getcollectr.com](https://app.getcollectr.com) — a PC (collection) tracker for trading-card-game *and* sports-card collectors. Browse a real card catalog, track your collection's value over time, run trade fairness checks, publish a shareable showcase, scan a card with your camera to identify it, and track NBA/F1/UFC/Tennis cards down to the specific parallel and serial number.

Built with Next.js (App Router) + TypeScript + Tailwind + Prisma/Postgres. See [`/Users/timlim/.claude/plans/build-me-a-web-jaunty-puzzle.md`](/Users/timlim/.claude/plans/build-me-a-web-jaunty-puzzle.md) for the full design rationale.

## What's real vs. what's a deliberate limitation

- **Card data & prices are real** — pulled from [pokemontcg.io](https://pokemontcg.io) (Pokémon), free and ToS-safe. Prices are never scraped and never fabricated.
- **Card images are a documented exception.** English Pokémon images come from pokemontcg.io and most non-English ones from [TCGdex](https://tcgdex.net), but ~15k JP/zh-TW cards have no image in either. Those are backfilled by a one-off, offline, heavily rate-limited crawl of the *official publisher* card databases (`pokemon-card.com`, `asia.pokemon-card.com`) — see `scripts/crawl-pokemon-ja-images.ts`. Only the URL is stored; images are hotlinked from the publisher's own CDN and never re-hosted, and every backfilled row is identifiable by hostname so the whole set can be dropped with one statement. Note that pokemon-card.com's footer asks that its images not be reproduced without permission; hotlinking is a deliberate compromise, not a claim of permission. Sports card images are attached per-card by the owner or hand-curated with a verified source.
- **Price history grows from launch day** — a daily snapshot job records one real price per card per day. There is no backfilled history; charts start short and get longer the longer the app runs.
- **Only Pokémon is fully wired.** The Sets page shows all ~19 major TCGs for visual parity with the real app, but the other 18 are marked "Coming soon" — no free, ToS-safe pricing API exists for them yet.
- **Accounts are required for the app.** PCs, watchlists, shortlists, decks, and saved views are server-backed so they follow you across browsers/devices. If your browser still has old anonymous `localStorage` holdings from before auth became required, the first signed-in visit offers a one-time import into the account.
- **Scan** uses Anthropic's Claude vision API to read a photographed card, then fuzzy-matches it against the catalog above. If no `ANTHROPIC_API_KEY` is set (or the call fails), it falls back to manual search — never a dead end.
- **Graded prices** (PSA/CGC/SGC/BGS tiers) come from [PriceCharting's official API](https://www.pricecharting.com/api-documentation) — real, documented, not scraping, but a paid product with no free tier. Fetched on-demand from the card detail page (not a bulk job — PriceCharting rate-limits to 1 request/sec, so syncing the whole catalog isn't practical) and cached for the day. Without `PRICECHARTING_API_KEY`, the panel just says so.
- **Sports cards** (NBA, F1, UFC, Tennis) are added straight into the PC — there's no Explore/Sets browsing for them (no free browsable sports-card catalog exists). Adding one searches [SportsCardsPro](https://www.sportscardspro.com/api-documentation) (PriceCharting's sister site, same API/rate-limit family) to match the exact parallel and pull a real price, with full manual entry always available as a fallback/override. The serial number of the *specific copy you own* (e.g. "23" of a "/99") is always a manual field — no catalog can know that. **Not built**: 130point.com itself can't be cloned — it sits behind Cloudflare bot-protection and its own docs describe scanning multiple marketplaces (eBay, PWCC, Goldin, etc.), so replicating it would mean scraping a bot-protected aggregator for *pricing* — which this project doesn't do (see the card-images bullet above for the one, narrower, image-only exception).

## Setup

### 1. Database

Needs a real Postgres connection (not SQLite) because the daily price-snapshot job needs to persist writes on a serverless host, whose filesystem is ephemeral.

- **Local dev**: point `DATABASE_URL`/`DIRECT_URL` at any local Postgres instance.
- **Production**: create a free [Neon](https://neon.tech) project and use its pooled (`DATABASE_URL`) and direct (`DIRECT_URL`) connection strings.

Copy `.env.example` to `.env.local` (used by Next.js) and to `.env` (used by the Prisma CLI) and fill in the values.

```bash
cp .env.example .env.local
cp .env.example .env
npx prisma migrate dev
```

### 2. Seed the catalog

Pulls real Pokémon card data (and today's real prices) from the free API above into your database:

```bash
npm run seed:catalog
```

Safe to re-run — everything is an upsert.

### 3. (Optional) Claude API key for Scan

Get a key at [console.anthropic.com](https://console.anthropic.com) and set `ANTHROPIC_API_KEY` in `.env.local`. Without it, the Scan page still works — it just skips straight to manual search.

### 4. (Optional, paid) PriceCharting API key for graded prices

Subscribe at [pricecharting.com](https://www.pricecharting.com/subscriptions) (no free tier), grab your API token from the Subscriptions page, and set `PRICECHARTING_API_KEY` in `.env.local`. Without it, the card detail page's "Graded Prices" panel just explains it's not configured.

### 5. (Optional, paid) SportsCardsPro API key for sports card search/pricing

Subscribe at [sportscardspro.com](https://www.sportscardspro.com/subscriptions) and set `SPORTSCARDSPRO_API_KEY` in `.env.local` (falls back to `PRICECHARTING_API_KEY` if that's unset, in case one subscription covers both). Without either, the Add Sports Card dialog's search step is skipped and cards can still be added fully manually — you just won't get an auto-matched parallel or a live price.

### 6. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing on your iPhone (free, from anywhere)

To try the dev server from your phone — including over cellular, away from your home network — use a free [Cloudflare quick tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/). No account or signup needed.

1. One-time: `brew install cloudflared`
2. Terminal 1: `npm run dev`
3. Terminal 2: `npm run tunnel`

`cloudflared` prints a `https://<random-words>.trycloudflare.com` URL — open that in Safari on your iPhone. `next.config.ts` already allowlists `*.trycloudflare.com` via `allowedDevOrigins`, so no further config is needed, but the URL changes every time you restart `npm run tunnel`, and the tunnel only stays up while both terminals and your Mac are running.

## Keeping prices fresh

`scripts/run-snapshot.ts` runs the same job the production cron job runs — fetches current prices for every set already in your catalog (plus every sports card any PC has added, if `SPORTSCARDSPRO_API_KEY`/`PRICECHARTING_API_KEY` is set) and records today's snapshot:

```bash
npm run snapshot:manual
```

In production, the `workers/cron-snapshot/` Worker schedules this daily via a Cloudflare Cron Trigger against `POST /api/cron/snapshot-prices`, authenticated with the `CRON_SECRET` env var (must match on both Workers — see `workers/cron-snapshot/wrangler.jsonc`).

## Project structure

- `src/app/` — routes (`explore`, `sets`, `card/[game]/[cardId]`, `pc`, `trade-analyzer`, `showcase/[shareId]`, `scan`) and API routes under `api/`.
- `src/lib/games/` — one adapter per TCG (currently just `pokemon/`), unified behind `registry.ts` so adding another game later means implementing `GameProvider` and flipping its status.
- `src/lib/pricing/` — the daily snapshot job, price-history reads, `pricecharting/` + `sportscardspro/` (the optional graded/sports-card adapters), and `pricecharting-family/` (their shared rate-limited client).
- `src/lib/sportscards/` — sports card creation/lookup logic and best-effort product-name parsing.
- `src/lib/pc/` — the PC store: `remote-store.ts` is the server-backed implementation, and `store.ts` is the single hook every component imports. Handles both TCG and sports card holdings. The underlying database model/table is still named `Portfolio`/`portfolios` (see `prisma/schema.prisma`) — only the app-facing "PC" branding changed.
- `src/auth.ts`, `src/app/api/auth/` — NextAuth (email/password, JWT sessions).
- `src/lib/scan/` — Claude vision call + Fuse.js catalog matching.
- `src/lib/scanning/` — the shared card-scanning engine (detect -> crop -> identify -> rank -> confidence) behind the Mass Card Scanner and Binder Import.
- `src/lib/cardvision/` — CardVision, the provider-agnostic vision-retrieval recognition architecture Phase 1 of; not used by Scan/Binder Import yet — see `docs/cardvision.md`.
- `prisma/schema.prisma` — the catalog, price-history, sports-card, and showcase-snapshot data model.

## Deploying

**Production actually deploys via Cloudflare Workers Builds' git integration** — every
push/merge to `main` triggers a Cloudflare-hosted build using the "Build command"
configured in the Cloudflare dashboard (Settings → Build), currently `npm run build:ci`,
followed by Cloudflare's own `wrangler deploy`. This is a genuinely separate pipeline
from anything in this repo's `git` history or `package.json`'s `deploy` script — **it
does not run `npm run deploy`, and therefore does not run npm's `predeploy` lifecycle
hook either.** That distinction caused two outages before it was understood:

- **2026-08-25**: migration `20260824135211_add_hide_pricing` was recorded as applied in
  `_prisma_migrations`, but its `ALTER TABLE` never ran against prod, so `authorize()`
  (which selects `hidePricing` on every login) threw on 100% of sign-in attempts. The fix
  at the time added a `predeploy` npm script (`prisma migrate deploy`) so that running
  `npm run deploy` would apply pending migrations first and fail loudly if it couldn't.
- **2026-08-26**: it happened again, to migration `20260826120000_add_holding_acquisition_fields`
  (`holdings.acquiredFrom`/`acquisitionMethod`/`acquisitionNotes`), crashing
  `GET /api/pc` for every signed-in user. The 2026-08-25 fix turned out not to have
  protected production at all: **Cloudflare Workers Builds never invokes `npm run
  deploy`**, so the `predeploy` hook added the day before had never once run in the
  actual deploy path — pushing `c437344` to `main` auto-deployed the new Worker code via
  Workers Builds immediately, completely decoupled from whether the migration's DDL had
  been separately, manually applied against prod.

The real fix has two parts:

1. **The Cloudflare dashboard's "Build command" is now `npm run build:ci`** (see the
   comment on `"main"` in `wrangler.jsonc`), which runs `prisma migrate deploy` and then
   `verify:schema` *before* `opennextjs-cloudflare build` — so the actual auto-deploy
   pipeline has the safeguard built directly into the command it runs, rather than
   depending on an npm lifecycle hook that pipeline never triggers. This needs
   `DATABASE_URL`/`DIRECT_URL` set as **Build** environment variables in the dashboard
   (Settings → Build → Variables and secrets) — a separate list from the Worker
   *runtime* secrets set below, which aren't visible during the build step.
2. **`verify:schema` (`scripts/verify-schema-drift.ts`) is an independent check**: it
   parses every `prisma/migrations/*/migration.sql` for the columns/tables it should
   have created, then queries `information_schema.columns` directly and fails loudly if
   any are missing — regardless of what `_prisma_migrations` claims. This is what
   actually catches "marked applied but DDL didn't run", since `prisma migrate
   status`/`deploy` both only ever consult that same bookkeeping table and will happily
   report "up to date" in exactly the state that caused both outages above.

`npm run deploy` (build + `wrangler deploy` from your own machine) still exists for
manual/local deploys, and still runs `predeploy` (`prisma migrate deploy && npm run
verify:schema`) first — same protection, applied against whatever `DATABASE_URL`/
`DIRECT_URL` are in your shell env, so **export production's connection strings first**:

```bash
DATABASE_URL="<neon pooled url>" DIRECT_URL="<neon direct url>" npm run deploy
npm run deploy:cron  # deploys the daily price-snapshot cron Worker (no DB migration needed)
```

If you're intentionally deploying with no pending schema changes and don't want to
export prod DB creds for that one command, run `npx prisma migrate status` first to
confirm there's nothing pending, or just skip straight to
`opennextjs-cloudflare build && opennextjs-cloudflare deploy` directly.

If either `verify:schema` or `prisma migrate deploy` ever does report drift, the
recovery is the same as both past incidents: run the specific migration's SQL directly
against prod, bypassing the (incorrectly) already-marked-applied migration history:

```bash
npx prisma db execute --file prisma/migrations/<dir>/migration.sql --schema prisma/schema.prisma
```

Set the env vars from `.env.example` as Worker secrets (`wrangler secret put <NAME>`, using your Neon connection strings) rather than in `wrangler.jsonc`, since that file is committed. `CRON_SECRET` must be set on both Workers with the same value — see `workers/cron-snapshot/wrangler.jsonc`.
