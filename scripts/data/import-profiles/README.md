# Import profiles

A JSON file describing how to scrape one card-set listing page into
CardStory's catalog, consumed by [`scripts/import-card-set.ts`](../../import-card-set.ts).
Profiles live here so a new source is "add a JSON file", not "write a new
script" — see `example-tcg.json` and `example-sports.json` for full,
annotated starting points (copy one and edit it).

## Workflow

1. `npx tsx scripts/import-card-set.ts scan <url>` — finds the CSS selector
   that matches one element per card on the page (`cardSelector`).
2. Open the page in your browser's devtools, inspect one card element, and
   note the relative selectors for its name/image/number/etc.
3. Copy `example-tcg.json` or `example-sports.json`, fill in `cardSelector`
   and `fields`.
4. `npx tsx scripts/import-card-set.ts preview <your-profile.json>` — scrapes
   without touching the database. Check the printed summary and the full
   dump written to `scripts/.cache/import-preview-<name>.json`.
5. Once it looks right: `npx tsx scripts/import-card-set.ts import
   <your-profile.json> --commit`.

This only fetches raw HTML (no JS execution) — a page that renders its card
grid client-side via JavaScript won't have that markup in the fetched HTML,
and `scan`/`preview` will come back empty. View-source (not devtools'
inspector, which shows the post-JS DOM) to check whether the page is
server-rendered before writing a profile against it.

## Top-level fields (every profile)

| Field         | Meaning |
|---------------|---------|
| `kind`        | `"tcg"` (writes Game/Set/CatalogItem) or `"sports"` (writes SportsCardItem). |
| `label`       | Free text, for your own reference only. |
| `sourceUrls`  | One or more page URLs to scrape, combined into one result set. Most checklist pages are a single URL; list more for a paginated listing. |
| `cardSelector`| CSS selector matching one element per card. |
| `fields`      | Per-card field selectors — see below. |
| `pageFields.releaseDate` | Optional: a page-level release date (e.g. printed once at the top of a checklist) used for any card that doesn't have its own. |

## `fields` (a "field spec" per card attribute)

Every entry is `{ selector?, attr?, regex?, match? }`, resolved **relative to
the card element** `cardSelector` matched (or to the whole page for
`pageFields`):

- `selector` — a CSS selector to find *within* the card element. Omit to use
  the card element itself.
- `attr` — `"text"` (default) reads the element's text; `"html"` reads its
  inner HTML; anything else is read as an HTML attribute (`"src"`, `"href"`,
  `"data-src"`, ...). `src`/`href`/`data-*` values are resolved to absolute
  URLs automatically.
- `regex` / `match` — optional: run a regex against the extracted text and
  keep one capture group (default: group 1, or the whole match if the
  pattern has no groups). Handy for something like `"#42 · Rare"` where you
  only want `42`.

`fields.name` is the only required field. Everything else — `image`,
`imageBack`, `number`, `rarity`, `artist`, `player`, `team`, `cardType`,
`parallel`, `serialLimit`, `releaseDate`, `detailUrl`, `imageFromDetail`,
`imageBackFromDetail` — is optional; a missing one is just left null on the
written row. `player`/`team`/`parallel`/`serialLimit` are sports-only;
`artist` is meaningful for TCG imports.

## Getting images from a card's own detail page

Most listing pages put a usable image right on the card tile (`fields.image`),
which is all you need. Some sites only show a small thumbnail on the listing
page (or no image at all) and keep the real image — front, and sometimes a
scanned back — on each card's own detail page instead. For that case:

1. Set `fields.detailUrl` to the link to each card's detail page.
2. Set `fields.imageFromDetail` (and `fields.imageBackFromDetail` for a back
   image) to the selector/attr for the image **on that detail page** — same
   field-spec shape as everything else, just resolved against the detail
   page's document instead of the card tile.

Both `preview` and `import` then do a second pass: for every card with a
`detailUrl` and no `imageUrl` yet, fetch that page and extract the image
before printing the summary (this works the same for `kind: "tcg"` and
`kind: "sports"` profiles — only which DB column the image lands on differs).
This is one extra HTTP request per missing-image card, so it's paced with a
delay between requests; skip it with `--skip-detail-images` if you just want
the listing-page data fast. `imageBackFromDetail` only has anywhere to go for
`kind: "sports"` — `CatalogItem` (TCG) has no back-image column yet.

## `kind: "tcg"` extra fields

```jsonc
"game": { "id": "onepiece", "name": "One Piece Card Game", "logoUrl": "OP", "status": "COMING_SOON" },
"set":  { "name": "Romance Dawn", "code": "OP01", "releaseDate": "2022-07-08" }
```

Writes `CatalogItem.id` as `"<game.id>:<externalId>"`, where `externalId` is
the card's `number` (slugified) if present, else the card's name — the same
id shape `scripts/seed-catalog.ts` uses, so existing pages that key off
`CatalogItem.id` work unmodified. If `game.id` isn't already in
`src/lib/games/registry.ts`, the tool writes the DB rows fine but reminds you
that the game won't appear on the Sets/Explore pages until it's added there.

## `kind: "sports"` extra fields

```jsonc
"sport": "NBA",              // must be one of the Sport enum values in prisma/schema.prisma
"year": 2024,
"distributor": "Panini",
"setName": "Prizm",
"defaultPlayerName": "Victor Wembanyama",  // used when fields.player isn't set / doesn't match a row
"defaultCardType": "base"    // "base" | "insert" | "short_print" | "ssp"
```

Writes via `upsertChecklistSportsCardItem` (same path
`scripts/seed-lamelo-ball.ts` uses), keyed by a deterministic
`externalKey` — re-running an import after fixing the profile updates rows
in place instead of duplicating them.

## No pricing

This tool never writes a price. Every price in this schema comes from a real
snapshot from an official/paid API (PriceCharting, pokemontcg.io,
SportsCardsPro) captured server-side — see the schema comments on
`PriceSnapshot`/`GradedPriceSnapshot`. A newly imported set gets real prices
once it's matched to one of those providers, same as any other set.
