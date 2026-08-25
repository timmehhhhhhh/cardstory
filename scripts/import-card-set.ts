/**
 * Import a new card set by scraping a web page the user supplies, rather
 * than pulling from one of the free TCG APIs lib/games/* already wraps
 * (that path is scripts/seed-catalog.ts) or hand-researching a sports
 * checklist (scripts/seed-lamelo-ball.ts). For a set with no free API and no
 * hand-curated checklist yet, this turns "here's a page listing every card
 * in the set" into real Set/CatalogItem rows (TCG) or SportsCardItem rows
 * (sports) — driven entirely by a JSON "import profile" you write once per
 * source site, so a new source is "add a profile", not "add a script". See
 * scripts/data/import-profiles/README.md for the profile schema.
 *
 * Three commands:
 *
 *   npx tsx scripts/import-card-set.ts scan <url>
 *     Fetches the page and ranks its repeated element patterns, to help you
 *     find the CSS selector that matches one element per card
 *     (profile.cardSelector) and the selectors for its fields.
 *
 *   npx tsx scripts/import-card-set.ts preview <profile.json>
 *     Scrapes per the profile WITHOUT touching the database. Prints a
 *     summary + the first 10 extracted cards, and writes the full extracted
 *     list to scripts/.cache/import-preview-<profile-name>.json for review.
 *     Always run this before `import` — a wrong selector fails silently
 *     (empty results or garbage text), and this is where you catch that.
 *
 *   npx tsx scripts/import-card-set.ts import <profile.json> [--commit]
 *     Same scrape + same preview output. Without --commit it's a dry run
 *     (nothing written). With --commit, upserts into the database:
 *       kind "tcg"    -> Game + Set + CatalogItem rows (Set.id/CatalogItem.id
 *                        follow the same "<gameId>:<code>" / "<gameId>:<externalId>"
 *                        convention scripts/seed-catalog.ts uses, so pages
 *                        rendered off those tables work unmodified).
 *       kind "sports" -> SportsCardItem rows via
 *                        upsertChecklistSportsCardItem (src/lib/sportscards/manage.ts),
 *                        the same upsert-by-externalKey path
 *                        scripts/seed-lamelo-ball.ts uses, so re-running an
 *                        import after fixing the profile updates rows in
 *                        place instead of duplicating them.
 *     A card missing a required field (name is guaranteed by the scraper;
 *     sports rows also need playerName) is skipped and reported, never
 *     written half-populated.
 *
 * No pricing is scraped or written here — every price in this schema is
 * either a real snapshot from an official/paid API (PriceCharting,
 * pokemontcg.io, SportsCardsPro) or explicitly absent; see the schema
 * comments on PriceSnapshot/GradedPriceSnapshot. A newly imported set gets
 * real prices later the normal way once it's matched to one of those
 * providers — this tool only seeds catalog metadata (name, image, artist,
 * player, release date, etc).
 *
 * A brand-new gameId (TCG) is upserted into the `games` table so
 * CatalogItem's foreign key is satisfiable, but that alone does not make it
 * appear in the app's UI — the Sets/Explore pages enumerate off the static
 * list in src/lib/games/registry.ts, so a genuinely new game also needs a
 * one-line addition there (this tool prints a reminder when your profile's
 * gameId isn't already in that registry).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { GameStatus, Sport } from "@prisma/client";
import { db } from "@/lib/db";
import { upsertChecklistSportsCardItem, type ChecklistCardType } from "@/lib/sportscards/manage";
import { GAMES } from "@/lib/games/registry";
import {
  fetchHtml,
  scanStructure,
  scrapeCards,
  slugify,
  type CardFieldMap,
  type ScrapedCard,
} from "./lib/generic-scrape";

const CACHE_DIR = path.join(process.cwd(), "scripts", ".cache");

// ---------------------------------------------------------------------------
// Profile schema
// ---------------------------------------------------------------------------

interface ProfileCommon {
  /** Free text, only used in this tool's own log output. */
  label?: string;
  /** Page(s) to scrape, in order. Most checklist pages are a single URL; pass more for a paginated listing (e.g. one entry per `?page=`). */
  sourceUrls: string[];
  cardSelector: string;
  fields: CardFieldMap;
  pageFields?: { releaseDate?: { selector?: string; attr?: string; regex?: string; match?: number } };
}

interface TcgProfile extends ProfileCommon {
  kind: "tcg";
  game: { id: string; name: string; logoUrl?: string; status?: GameStatus; sortOrder?: number };
  set: { name: string; code: string; releaseDate?: string; nameEn?: string };
}

interface SportsProfile extends ProfileCommon {
  kind: "sports";
  sport: Sport;
  year?: number;
  distributor?: string;
  setName: string;
  /** Used for every card whose `fields.player` didn't match anything on the page — e.g. a single-player checklist page that never repeats the player's name per row. */
  defaultPlayerName?: string;
  defaultTeamName?: string;
  /** "base" | "insert" | "short_print" | "ssp" — applied to every row (checklist rows are tagged uniformly; see SportsCardItem.cardType). Defaults to "base". */
  defaultCardType?: ChecklistCardType;
}

type Profile = TcgProfile | SportsProfile;

function loadProfile(filePath: string): Profile {
  const raw = fs.readFileSync(filePath, "utf-8");
  const profile = JSON.parse(raw) as Profile;
  if (profile.kind !== "tcg" && profile.kind !== "sports") {
    throw new Error(`Profile "kind" must be "tcg" or "sports", got: ${JSON.stringify((profile as any).kind)}`);
  }
  if (!profile.sourceUrls?.length) throw new Error(`Profile needs at least one entry in "sourceUrls".`);
  if (!profile.cardSelector) throw new Error(`Profile is missing "cardSelector".`);
  if (!profile.fields?.name) throw new Error(`Profile is missing "fields.name".`);
  return profile;
}

// ---------------------------------------------------------------------------
// scan
// ---------------------------------------------------------------------------

async function cmdScan(args: string[]) {
  const url = args[0];
  if (!url) {
    console.error("Usage: import-card-set.ts scan <url> [--min N]");
    process.exit(1);
  }
  const minIdx = args.indexOf("--min");
  const min = minIdx !== -1 ? Number(args[minIdx + 1]) : 4;

  console.log(`Fetching ${url} ...`);
  const html = await fetchHtml(url);
  const candidates = scanStructure(html, min);

  if (candidates.length === 0) {
    console.log(`No element repeated >= ${min} times. Try a lower --min, or the page may be JS-rendered (this tool fetches raw HTML only — see README).`);
    return;
  }

  console.log(`\nMost-repeated element patterns on the page (candidates for cardSelector):\n`);
  for (const c of candidates) {
    console.log(`  ${String(c.count).padStart(4)}x  ${c.selector}`);
    console.log(`         "${c.sampleText}"`);
  }
  console.log(`\nPick the one whose count matches the set's real card count and whose sample text looks like one card, then use it as "cardSelector" in your profile. Field selectors (name/image/number/...) are then relative to that element — inspect one match in your browser's devtools to find them.`);
}

// ---------------------------------------------------------------------------
// preview (shared by `preview` and `import`)
// ---------------------------------------------------------------------------

async function runScrape(profile: Profile): Promise<ScrapedCard[]> {
  console.log(`Scraping ${profile.sourceUrls.length} page(s)...`);
  const cards = await scrapeCards({
    sourceUrls: profile.sourceUrls,
    cardSelector: profile.cardSelector,
    fields: profile.fields,
    pageFields: profile.pageFields,
  });
  return cards;
}

function summarize(profile: Profile, cards: ScrapedCard[]) {
  console.log(`\nExtracted ${cards.length} card row(s).`);
  if (cards.length === 0) {
    console.log(`Zero rows usually means cardSelector didn't match anything, or fields.name.selector didn't resolve inside it — run \`scan\` again against the same URL and double-check the selector.`);
    return;
  }

  const missingImage = cards.filter((c) => !c.imageUrl).length;
  const missingNumber = cards.filter((c) => !c.number).length;
  console.log(`  missing image:  ${missingImage}`);
  console.log(`  missing number: ${missingNumber}`);
  if (profile.kind === "sports") {
    const missingPlayer = cards.filter((c) => !c.player && !profile.defaultPlayerName).length;
    console.log(`  missing player (and no defaultPlayerName set): ${missingPlayer}`);
  }

  console.log(`\nFirst ${Math.min(10, cards.length)} row(s):`);
  for (const c of cards.slice(0, 10)) {
    const bits = [c.number && `#${c.number}`, c.rarity, c.artist && `art: ${c.artist}`, c.player, c.parallel]
      .filter(Boolean)
      .join(" · ");
    console.log(`  - ${c.name}${bits ? ` (${bits})` : ""}${c.imageUrl ? "" : "  [no image]"}`);
  }
}

function writePreviewCache(profileName: string, cards: ScrapedCard[]) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `import-preview-${profileName}.json`);
  fs.writeFileSync(file, JSON.stringify(cards, null, 2));
  console.log(`\nWrote full extracted list to ${path.relative(process.cwd(), file)}`);
}

async function cmdPreview(args: string[]) {
  const profilePath = args[0];
  if (!profilePath) {
    console.error("Usage: import-card-set.ts preview <profile.json>");
    process.exit(1);
  }
  const profile = loadProfile(profilePath);
  const cards = await runScrape(profile);
  summarize(profile, cards);
  writePreviewCache(path.basename(profilePath, ".json"), cards);
}

// ---------------------------------------------------------------------------
// import (write)
// ---------------------------------------------------------------------------

function parseReleaseDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function normalizeCardType(raw: string | undefined, fallback: ChecklistCardType): ChecklistCardType {
  const s = raw?.toLowerCase() ?? "";
  if (s.includes("ssp") || s.includes("super short")) return "ssp";
  if (s.includes("short")) return "short_print";
  if (s.includes("insert")) return "insert";
  if (s.includes("base")) return "base";
  return fallback;
}

async function writeTcg(profile: TcgProfile, cards: ScrapedCard[]) {
  await db.game.upsert({
    where: { id: profile.game.id },
    create: {
      id: profile.game.id,
      name: profile.game.name,
      logoUrl: profile.game.logoUrl ?? profile.game.id.slice(0, 4).toUpperCase(),
      status: profile.game.status ?? "COMING_SOON",
      sortOrder: profile.game.sortOrder ?? 999,
    },
    update: {
      name: profile.game.name,
      logoUrl: profile.game.logoUrl ?? undefined,
      status: profile.game.status ?? undefined,
    },
  });
  if (!GAMES.some((g) => g.id === profile.game.id)) {
    console.log(
      `Note: "${profile.game.id}" isn't in src/lib/games/registry.ts yet — this import will create real rows, but the game won't show up on the Sets/Explore pages until it's added there.`
    );
  }

  const setId = `${profile.game.id}:${profile.set.code}`;
  const setReleaseDate =
    parseReleaseDate(profile.set.releaseDate) ?? parseReleaseDate(cards.find((c) => c.releaseDate)?.releaseDate);
  await db.set.upsert({
    where: { id: setId },
    create: {
      id: setId,
      gameId: profile.game.id,
      name: profile.set.name,
      nameEn: profile.set.nameEn ?? null,
      code: profile.set.code,
      releaseDate: setReleaseDate ?? null,
      cardCount: cards.length,
    },
    update: {
      name: profile.set.name,
      nameEn: profile.set.nameEn,
      releaseDate: setReleaseDate,
      cardCount: cards.length,
    },
  });

  const seenExternalIds = new Set<string>();
  let written = 0;
  for (const card of cards) {
    let externalId = card.number ? slugify(card.number) : slugify(card.name);
    if (seenExternalIds.has(externalId)) {
      // Two rows resolved to the same id (e.g. no card number and a
      // repeated name, like alternate art printings) — disambiguate rather
      // than silently overwrite one with the other.
      let n = 2;
      while (seenExternalIds.has(`${externalId}-${n}`)) n++;
      externalId = `${externalId}-${n}`;
    }
    seenExternalIds.add(externalId);

    const catalogItemId = `${profile.game.id}:${externalId}`;
    const data = {
      gameId: profile.game.id,
      setId,
      externalId,
      variantKey: "",
      name: card.name,
      number: card.number ?? null,
      rarity: card.rarity ?? null,
      artist: card.artist ?? null,
      cardType: card.cardType ?? null,
      imageSmallUrl: card.imageUrl ?? null,
      imageLargeUrl: card.imageUrl ?? null,
    };
    await db.catalogItem.upsert({
      where: { id: catalogItemId },
      create: { id: catalogItemId, ...data },
      update: data,
    });
    written++;
  }

  console.log(`\nUpserted Game "${profile.game.id}", Set "${setId}", and ${written} CatalogItem row(s).`);
}

async function writeSports(profile: SportsProfile, cards: ScrapedCard[]) {
  const defaultCardType = profile.defaultCardType ?? "base";
  const profileReleaseDate = parseReleaseDate(cards.find((c) => c.releaseDate)?.releaseDate);

  let written = 0;
  const skipped: string[] = [];
  for (const card of cards) {
    const playerName = card.player ?? profile.defaultPlayerName;
    if (!playerName) {
      skipped.push(card.name);
      continue;
    }
    await upsertChecklistSportsCardItem({
      sport: profile.sport,
      year: profile.year,
      distributor: profile.distributor,
      setName: profile.setName,
      playerName,
      teamName: card.team ?? profile.defaultTeamName,
      cardNumber: card.number,
      parallelName: card.parallel,
      isAutograph: false,
      isRelic: false,
      serialLimit: card.serialLimit,
      imageUrl: card.imageUrl,
      cardType: normalizeCardType(card.cardType, defaultCardType),
      releaseDate: parseReleaseDate(card.releaseDate) ?? profileReleaseDate,
    });
    written++;
  }

  console.log(`\nUpserted ${written} SportsCardItem row(s).`);
  if (skipped.length > 0) {
    console.log(
      `Skipped ${skipped.length} row(s) with no playerName (set "defaultPlayerName" in the profile, or add a "player" field selector). First few: ${skipped
        .slice(0, 5)
        .join(", ")}`
    );
  }
}

async function cmdImport(args: string[]) {
  const profilePath = args[0];
  if (!profilePath) {
    console.error("Usage: import-card-set.ts import <profile.json> [--commit]");
    process.exit(1);
  }
  const commit = args.includes("--commit");
  const profile = loadProfile(profilePath);
  const cards = await runScrape(profile);
  summarize(profile, cards);
  writePreviewCache(path.basename(profilePath, ".json"), cards);

  if (cards.length === 0) return;

  if (!commit) {
    console.log(`\nDry run — nothing written. Re-run with --commit to write these rows to the database.`);
    return;
  }

  if (profile.kind === "tcg") await writeTcg(profile, cards);
  else await writeSports(profile, cards);
}

// ---------------------------------------------------------------------------

function usage() {
  console.error(
    [
      "Usage:",
      "  npx tsx scripts/import-card-set.ts scan <url> [--min N]",
      "  npx tsx scripts/import-card-set.ts preview <profile.json>",
      "  npx tsx scripts/import-card-set.ts import <profile.json> [--commit]",
      "",
      "See scripts/data/import-profiles/README.md for the profile schema.",
    ].join("\n")
  );
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "scan") await cmdScan(rest);
  else if (cmd === "preview") await cmdPreview(rest);
  else if (cmd === "import") await cmdImport(rest);
  else {
    usage();
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
