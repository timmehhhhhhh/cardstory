# CardStory

A clone of [app.getcollectr.com](https://app.getcollectr.com) — a portfolio tracker for trading-card-game *and* sports-card collectors. Browse a real card catalog, track your collection's value over time, run trade fairness checks, publish a shareable showcase, scan a card with your camera to identify it, and track NBA/F1/UFC/Tennis cards down to the specific parallel and serial number.

Built with Next.js (App Router) + TypeScript + Tailwind + Prisma/Postgres. See [`/Users/timlim/.claude/plans/build-me-a-web-jaunty-puzzle.md`](/Users/timlim/.claude/plans/build-me-a-web-jaunty-puzzle.md) for the full design rationale.

## What's real vs. what's a deliberate limitation

- **Card data & prices are real** — pulled from [pokemontcg.io](https://pokemontcg.io) (Pokémon), free and ToS-safe. No scraping, no fabricated numbers.
- **Price history grows from launch day** — a daily snapshot job records one real price per card per day. There is no backfilled history; charts start short and get longer the longer the app runs.
- **Only Pokémon is fully wired.** The Sets page shows all ~19 major TCGs for visual parity with the real app, but the other 18 are marked "Coming soon" — no free, ToS-safe pricing API exists for them yet.
- **Accounts are optional.** Logged out, portfolios live entirely in the browser's `localStorage` — clearing site data loses them (Showcase links, published separately, survive that). Signing up (email + password) moves your portfolio to the server instead, so it follows you across browsers/devices; the first time you log in with local holdings still on that browser, you're offered a one-time import into the account.
- **Scan** uses Google Gemini's vision API to read a photographed card, then fuzzy-matches it against the catalog above. If no `GEMINI_API_KEY` is set (or the call fails), it falls back to manual search — never a dead end.
- **Graded prices** (PSA/CGC/SGC/BGS tiers) come from [PriceCharting's official API](https://www.pricecharting.com/api-documentation) — real, documented, not scraping, but a paid product with no free tier. Fetched on-demand from the card detail page (not a bulk job — PriceCharting rate-limits to 1 request/sec, so syncing the whole catalog isn't practical) and cached for the day. Without `PRICECHARTING_API_KEY`, the panel just says so.
- **Sports cards** (NBA, F1, UFC, Tennis) are added straight into the Portfolio — there's no Explore/Sets browsing for them (no free browsable sports-card catalog exists). Adding one searches [SportsCardsPro](https://www.sportscardspro.com/api-documentation) (PriceCharting's sister site, same API/rate-limit family) to match the exact parallel and pull a real price, with full manual entry always available as a fallback/override. The serial number of the *specific copy you own* (e.g. "23" of a "/99") is always a manual field — no catalog can know that. **Not built**: 130point.com itself can't be cloned — it sits behind Cloudflare bot-protection and its own docs describe scanning multiple marketplaces (eBay, PWCC, Goldin, etc.), so replicating it would mean scraping, which this project avoids throughout.

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

### 3. (Optional) Gemini API key for Scan

Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and set `GEMINI_API_KEY` in `.env.local`. Without it, the Scan page still works — it just skips straight to manual search.

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

`scripts/run-snapshot.ts` runs the same job the production cron job runs — fetches current prices for every set already in your catalog (plus every sports card any portfolio has added, if `SPORTSCARDSPRO_API_KEY`/`PRICECHARTING_API_KEY` is set) and records today's snapshot:

```bash
npm run snapshot:manual
```

In production, `vercel.json` schedules this daily via Vercel Cron against `POST /api/cron/snapshot-prices`, authenticated with the `CRON_SECRET` env var.

## Project structure

- `src/app/` — routes (`explore`, `sets`, `card/[game]/[cardId]`, `portfolio`, `trade-analyzer`, `showcase/[shareId]`, `scan`) and API routes under `api/`.
- `src/lib/games/` — one adapter per TCG (currently just `pokemon/`), unified behind `registry.ts` so adding another game later means implementing `GameProvider` and flipping its status.
- `src/lib/pricing/` — the daily snapshot job, price-history reads, `pricecharting/` + `sportscardspro/` (the optional graded/sports-card adapters), and `pricecharting-family/` (their shared rate-limited client).
- `src/lib/sportscards/` — sports card creation/lookup logic and best-effort product-name parsing.
- `src/lib/portfolio/` — the portfolio store: `local-store.ts` (localStorage, used when logged out), `remote-store.ts` (server-backed, used when logged in), and `store.ts` (the switcher every component actually imports). Handles both TCG and sports card holdings.
- `src/auth.ts`, `src/app/api/auth/` — NextAuth (email/password, JWT sessions).
- `src/lib/scan/` — Gemini vision call + Fuse.js catalog matching.
- `prisma/schema.prisma` — the catalog, price-history, sports-card, and showcase-snapshot data model.

## Deploying

Deploy to Vercel, set the env vars from `.env.example` in the project settings (using your Neon connection strings), and the cron job registers automatically from `vercel.json`.
