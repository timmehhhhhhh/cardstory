# CardStory

A clone of [app.getcollectr.com](https://app.getcollectr.com) — a portfolio tracker for trading-card-game collectors. Browse a real card catalog, track your collection's value over time, run trade fairness checks, publish a shareable showcase, and scan a card with your camera to identify it.

Built with Next.js (App Router) + TypeScript + Tailwind + Prisma/Postgres. See [`/Users/timlim/.claude/plans/build-me-a-web-jaunty-puzzle.md`](/Users/timlim/.claude/plans/build-me-a-web-jaunty-puzzle.md) for the full design rationale.

## What's real vs. what's a deliberate limitation

- **Card data & prices are real** — pulled from [pokemontcg.io](https://pokemontcg.io) (Pokémon) and [Scryfall](https://scryfall.com) (Magic: The Gathering), both free and ToS-safe. No scraping, no fabricated numbers.
- **Price history grows from launch day** — a daily snapshot job records one real price per card per day. There is no backfilled history; charts start short and get longer the longer the app runs.
- **Only Pokémon + MTG are fully wired.** The Sets page shows all ~19 major TCGs for visual parity with the real app, but the other 17 are marked "Coming soon" — no free, ToS-safe pricing API exists for them yet.
- **No accounts.** Portfolios live in the browser's `localStorage`. Clearing site data loses them (Showcase links, published separately, survive that).
- **Scan** uses Google Gemini's vision API to read a photographed card, then fuzzy-matches it against the catalog above. If no `GEMINI_API_KEY` is set (or the call fails), it falls back to manual search — never a dead end.
- **Graded prices** (PSA/CGC/SGC/BGS tiers) come from [PriceCharting's official API](https://www.pricecharting.com/api-documentation) — real, documented, not scraping, but a paid product with no free tier. Fetched on-demand from the card detail page (not a bulk job — PriceCharting rate-limits to 1 request/sec, so syncing the whole catalog isn't practical) and cached for the day. Without `PRICECHARTING_API_KEY`, the panel just says so.

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

Pulls real Pokémon + MTG card data (and today's real prices) from the free APIs above into your database:

```bash
npm run seed:catalog
```

Safe to re-run — everything is an upsert.

### 3. (Optional) Gemini API key for Scan

Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and set `GEMINI_API_KEY` in `.env.local`. Without it, the Scan page still works — it just skips straight to manual search.

### 4. (Optional, paid) PriceCharting API key for graded prices

Subscribe at [pricecharting.com](https://www.pricecharting.com/subscriptions) (no free tier), grab your API token from the Subscriptions page, and set `PRICECHARTING_API_KEY` in `.env.local`. Without it, the card detail page's "Graded Prices" panel just explains it's not configured.

### 5. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Keeping prices fresh

`scripts/run-snapshot.ts` runs the same job the production cron job runs — fetches current prices for every set already in your catalog and records today's snapshot:

```bash
npm run snapshot:manual
```

In production, `vercel.json` schedules this daily via Vercel Cron against `POST /api/cron/snapshot-prices`, authenticated with the `CRON_SECRET` env var.

## Project structure

- `src/app/` — routes (`explore`, `sets`, `card/[game]/[cardId]`, `portfolio`, `trade-analyzer`, `showcase/[shareId]`, `scan`) and API routes under `api/`.
- `src/lib/games/` — one adapter per TCG (`pokemon/`, `mtg/`), unified behind `registry.ts` so adding another game later means implementing `GameProvider` and flipping its status.
- `src/lib/pricing/` — the daily snapshot job, price-history reads, and `pricecharting/` (the optional graded-price adapter).
- `src/lib/portfolio/` — the local-only (`localStorage`) portfolio store and its selectors.
- `src/lib/scan/` — Gemini vision call + Fuse.js catalog matching.
- `prisma/schema.prisma` — the catalog + price-history + showcase-snapshot data model.

## Deploying

Deploy to Vercel, set the env vars from `.env.example` in the project settings (using your Neon connection strings), and the cron job registers automatically from `vercel.json`.
