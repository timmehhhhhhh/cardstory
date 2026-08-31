/**
 * Backfills Set.logoUrl (and a candidate Set.nameEn) for Japanese Pokémon
 * sets from jp.pokellector.com, a fan card database — the same source
 * crawl-pokemon-jp-pokellector-images.ts already uses for card images.
 *
 * Why this exists: scripts/data/pokemon-set-logos.ts (consumed by
 * backfill-set-logo-url.ts) currently only has entries for zh-cn sets,
 * sourced from a German retailer — JA and zh-tw sets have zero logo
 * coverage today, so those Set rows fall back to the reconstructed symbol
 * icon in the UI (see set-tile.tsx's SetIcon). tcgdex — our provider for
 * every non-English Pokémon set — only ever returns a `logo` for the "en"
 * locale (see mapTcgdexSet's doc comment in lib/games/pokemon/mapper.ts), so
 * this has to come from a third party.
 *
 * Unlike the JP card-image crawler, this needs exactly ONE request:
 * jp.pokellector.com/sets renders every set (204 of them, confirmed) as one
 * button per set on a single page, and each button already carries
 * everything needed — no per-set page fetch required:
 *
 *   <a class="button" name="M5" href="/Abyss-Eye-Expansion/" title="Abyss Eye Set">
 *     <img src="https://den-media.pokellector.com/logos/Abyss-Eye.logo.433.png">
 *     ...<span>Abyss Eye</span></a>
 *
 * The button's `name` attribute (e.g. "M5") is pokellector's own set code,
 * which — confirmed against scripts/data/pokemon-set-translations.ts's
 * existing entries (e.g. "ja:M5": "Abyss Eye") — is the SAME code tcgdex
 * uses as the JA Set.code suffix. That makes the join exact-code, not
 * fuzzy-name: a button only ever produces a mapping when its `name` matches
 * an existing `pokemon:ja:<code>` Set row.
 *
 * Only the logo URL is stored; images stay hotlinked from pokellector's own
 * CDN (den-media.pokellector.com), never re-hosted — same policy as every
 * other crawler here.
 *
 * TW/ZH-CN/KO are NOT covered: there is no tw./cn./kr.pokellector.com (DNS
 * fails on all three, confirmed) — pokellector only mirrors EN and JA.
 *
 *   npx tsx scripts/crawl-pokemon-set-logos-pokellector.ts
 *
 * Always writes scripts/data/set-logos/pokellector-ja.json with
 * verified:false — flip it only after reading the summary below and
 * spot-checking a few rows against the live jp.pokellector.com pages, same
 * gate scripts/seed-card-images.ts already enforces on its own inputs.
 * Unmatched pokellector buttons (sets pokellector has that our DB doesn't,
 * or a code that doesn't line up) go to pockellector-ja.review.json instead
 * of being silently dropped.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "@/lib/db";
import { createPoliteFetcher } from "./lib/polite-fetch";
import type { SetLogoEntry, SetLogoFile, SetLogoReviewEntry, SetLogoReviewFile } from "./data/set-logos/types";

const ORIGIN = "https://jp.pokellector.com";
const SETS_URL = `${ORIGIN}/sets`;
const OUT_DIR = path.join(process.cwd(), "scripts", "data", "set-logos");
const OUT_FILE = path.join(OUT_DIR, "pokellector-ja.json");
const REVIEW_FILE = path.join(OUT_DIR, "pokellector-ja.review.json");

const politeGet = createPoliteFetcher();

interface PokellectorSetButton {
  code: string;
  slug: string;
  nameEn: string;
  logoUrl: string;
}

/**
 * Parses `<a class="button" name="CODE" href="/slug/" title="Name Set">
 * <img src="https://den-media.pokellector.com/logos/....png">` buttons off
 * the /sets listing markup. Deliberately regex-based like the sibling JP
 * image crawler (cheerio is used elsewhere in this repo's crawlers, but the
 * markup here is simple/repetitive enough that a scoped regex is less code
 * and avoids a full DOM parse of a 200+ node listing page).
 */
function parseSetButtons(html: string): PokellectorSetButton[] {
  const pattern =
    /<a class="button" name="([^"]*)" href="(\/[^"]+)" title="([^"]*) Set"><img src="(https:\/\/den-media\.pokellector\.com\/logos\/[^"]+)">/g;
  const out: PokellectorSetButton[] = [];
  for (const m of html.matchAll(pattern)) {
    const [, code, slug, nameEn, logoUrl] = m;
    if (!code) continue; // header rows (series groupings) have no `name` attr
    out.push({ code, slug, nameEn, logoUrl });
  }
  return out;
}

async function main() {
  console.log(`Fetching ${SETS_URL}...`);
  const res = await politeGet(SETS_URL);
  if (res.status !== 200) throw new Error(`GET /sets -> ${res.status}`);

  const buttons = parseSetButtons(res.body);
  console.log(`Parsed ${buttons.length} set buttons from the listing page.`);

  // pokellector's own listing page is not internally consistent: confirmed
  // live, it has TWO buttons both with name="S12" (one correctly linking to
  // Paradigm-Trigger, one — a real error on pokellector's side — linking to
  // Lost-Abyss, which is actually S11). Matching either blind would silently
  // pair the wrong logo/name with pokemon:ja:S12 depending on iteration
  // order. Guard against this generally: any code that appears on more than
  // one button is ambiguous and goes to the review file for a human to sort
  // out, never auto-matched.
  const codeOccurrences = new Map<string, number>();
  for (const button of buttons) {
    const code = button.code.toUpperCase();
    codeOccurrences.set(code, (codeOccurrences.get(code) ?? 0) + 1);
  }

  const dbSets = await db.set.findMany({
    where: { id: { startsWith: "pokemon:ja:" } },
    select: { id: true, code: true, name: true, logoUrl: true, nameEn: true },
  });
  const byCode = new Map(dbSets.map((s) => [s.code.replace(/^ja:/, "").toUpperCase(), s]));

  const entries: SetLogoEntry[] = [];
  const review: SetLogoReviewEntry[] = [];
  let alreadySet = 0;
  let ambiguous = 0;

  for (const button of buttons) {
    const code = button.code.toUpperCase();
    if ((codeOccurrences.get(code) ?? 0) > 1) {
      ambiguous += 1;
      review.push({
        sourceCode: button.code,
        sourceUrl: `${ORIGIN}${button.slug}`,
        sourceName: `${button.nameEn} (ambiguous: "${button.code}" appears on more than one pokellector.com button)`,
        logoUrl: button.logoUrl,
      });
      continue;
    }
    const dbSet = byCode.get(code);
    if (!dbSet) {
      review.push({
        sourceCode: button.code,
        sourceUrl: `${ORIGIN}${button.slug}`,
        sourceName: button.nameEn,
        logoUrl: button.logoUrl,
      });
      continue;
    }
    if (dbSet.logoUrl) {
      alreadySet += 1;
      continue;
    }
    entries.push({
      setId: dbSet.id,
      logoUrl: button.logoUrl,
      nameEn: button.nameEn,
      sourceUrl: `${ORIGIN}${button.slug}`,
      sourceName: button.nameEn,
    });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const outFile: SetLogoFile = {
    gameId: "pokemon",
    sourceNote: `Crawled from ${SETS_URL} on ${new Date().toISOString()} by crawl-pokemon-set-logos-pokellector.ts`,
    verified: false,
    generatedAt: new Date().toISOString(),
    entries,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(outFile, null, 2));

  const reviewFile: SetLogoReviewFile = {
    gameId: "pokemon",
    note: "pokellector.com/jp set buttons with no matching pokemon:ja:<code> Set row (or code mismatch). Never seeded.",
    generatedAt: new Date().toISOString(),
    entries: review,
  };
  fs.writeFileSync(REVIEW_FILE, JSON.stringify(reviewFile, null, 2));

  console.log(`\nMatched (logoUrl currently null): ${entries.length}`);
  console.log(`Already had a logoUrl (left alone): ${alreadySet}`);
  console.log(`No matching DB set / ambiguous code (see review file): ${review.length} (of which ${ambiguous} ambiguous)`);
  console.log(`\nWrote ${path.relative(process.cwd(), OUT_FILE)}`);
  console.log(`Wrote ${path.relative(process.cwd(), REVIEW_FILE)}`);
  console.log(
    `\nverified:false — spot-check a few entries against ${SETS_URL} before flipping it, then run:\n  npx tsx scripts/backfill-set-logo-url.ts\n  npx tsx scripts/backfill-set-name-en.ts`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
