/**
 * Backfills Set.logoUrl (and a candidate Set.nameEn) for non-English
 * Pokémon sets from dextcg.com, a TCG set/price tracker — a second source
 * alongside crawl-pokemon-set-logos-pokellector.ts (jp.pokellector.com,
 * JA only). Covers two of dextcg's language listings:
 *
 *   https://dextcg.com/expansions?lang=japanese  -> "ja:" sets
 *   https://dextcg.com/expansions?lang=chinese    -> "zh-cn:" sets (dextcg
 *     labels this "Chinese" but its logos are prefixed "scn_" — Simplified
 *     Chinese, matching our zh-cn rows; it does not carry zh-tw at all)
 *
 * Both listing pages render every set as one card in the initial HTML (no
 * pagination, no client-fetched data) with everything needed inline — slug,
 * logo URL, English display name, release date, and card count — so, like
 * the pokellector crawler, this needs exactly ONE request per language:
 *
 *   <a href="/expansions/jpn_m5">...logos/jpn_m5.png...
 *     <h3>Abyss Eye</h3><p>May 22, 2026</p><p>118 Cards</p></a>
 *
 * Matching confidence differs by language:
 *   - JA: dextcg's slug suffix (e.g. "m5" -> "M5") is confirmed IDENTICAL to
 *     the tcgdex-derived Set.code suffix (cross-checked against
 *     scripts/data/pokemon-set-translations.ts's existing "ja:M5": "Abyss
 *     Eye" entry, and against pokellector's own M5/"Abyss Eye" button) — so
 *     JA matching is exact-code, same trust level as the pokellector
 *     crawler.
 *   - zh-cn: dextcg's slug suffix is CLOSE to but not always identical to
 *     our Set.code suffix — tcgdex zh-cn codes often carry a trailing "C"
 *     dextcg's don't (e.g. our "CBB6C" vs dextcg's "cbb6"). This crawler
 *     tries the exact code first, then the code with a "C" appended; if
 *     neither exists as a Set row, or the resolved row's own card count is
 *     more than 2 off from what dextcg reports (a second, independent
 *     corroboration that the two rows are actually the same set), it goes
 *     to the review file instead of being trusted blind. Mirrors the
 *     "never trust a code match alone" guard crawl-pokemon-cn-images.ts
 *     already documents for this exact code-drift problem.
 *
 * Only the logo URL is stored; images stay hotlinked from dextcg's own CDN
 * (static.dextcg.com), never re-hosted.
 *
 *   npx tsx scripts/crawl-pokemon-set-logos-dextcg.ts jpn
 *   npx tsx scripts/crawl-pokemon-set-logos-dextcg.ts chs
 *
 * Always writes scripts/data/set-logos/dextcg-<lang>.json with
 * verified:false — flip it only after reading the summary below and
 * spot-checking a few rows against the live dextcg.com pages.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "@/lib/db";
import { createPoliteFetcher } from "./lib/polite-fetch";
import type { SetLogoEntry, SetLogoFile, SetLogoReviewEntry, SetLogoReviewFile } from "./data/set-logos/types";

const LANG_CONFIG = {
  jpn: { dbPrefix: "ja", slugPrefix: "jpn_", requireExactCode: true },
  chs: { dbPrefix: "zh-cn", slugPrefix: "scn_", requireExactCode: false },
} as const;
type DextcgLang = keyof typeof LANG_CONFIG;

const ORIGIN = "https://dextcg.com";
const OUT_DIR = path.join(process.cwd(), "scripts", "data", "set-logos");

const politeGet = createPoliteFetcher();

interface DextcgSetCard {
  slug: string; // e.g. "jpn_m5" / "scn_cbb6"
  logoUrl: string;
  nameEn: string;
  releaseDate: string;
  cardCountText: string; // e.g. "118 Cards"
}

function parseSetCards(html: string): DextcgSetCard[] {
  const pattern =
    /href="\/expansions\/([a-z]+_[a-z0-9.]+)"[\s\S]*?logos\/[a-z0-9._]+\.png[\s\S]*?<h3[^>]*>([^<]*)<\/h3><p[^>]*>([^<]*)<\/p>[\s\S]*?<p[^>]*>([^<]*)<\/p>/g;
  const out: DextcgSetCard[] = [];
  for (const m of html.matchAll(pattern)) {
    const [, slug, nameEn, releaseDate, cardCountText] = m;
    out.push({
      slug,
      logoUrl: `https://static.dextcg.com/content/sets/logos/${slug}.png`,
      nameEn: nameEn.replace(/&amp;/g, "&").replace(/&#x27;/g, "'"),
      releaseDate,
      cardCountText,
    });
  }
  return out;
}

function parseCardCount(text: string): number | null {
  const m = /^(\d+)\s*Card/.exec(text);
  return m ? Number(m[1]) : null;
}

async function main() {
  const lang = process.argv[2] as DextcgLang | undefined;
  if (!lang || !(lang in LANG_CONFIG)) {
    console.error(`Usage: npx tsx scripts/crawl-pokemon-set-logos-dextcg.ts <${Object.keys(LANG_CONFIG).join("|")}>`);
    process.exit(1);
    return;
  }
  const { dbPrefix, slugPrefix, requireExactCode } = LANG_CONFIG[lang];
  const url = `${ORIGIN}/expansions?lang=${lang === "jpn" ? "japanese" : "chinese"}`;

  console.log(`Fetching ${url}...`);
  const res = await politeGet(url);
  if (res.status !== 200) throw new Error(`GET ${url} -> ${res.status}`);

  const cards = parseSetCards(res.body).filter((c) => c.slug.startsWith(slugPrefix));
  console.log(`Parsed ${cards.length} set cards from the listing page.`);

  const dbSets = await db.set.findMany({
    where: { id: { startsWith: `pokemon:${dbPrefix}:` } },
    select: { id: true, code: true, name: true, logoUrl: true, nameEn: true, cardCount: true },
  });
  const byCode = new Map(dbSets.map((s) => [s.code.replace(new RegExp(`^${dbPrefix}:`), "").toUpperCase(), s]));

  const entries: SetLogoEntry[] = [];
  const review: SetLogoReviewEntry[] = [];
  let alreadySet = 0;

  for (const card of cards) {
    const rawCode = card.slug.slice(slugPrefix.length).toUpperCase();
    const dextcgCardCount = parseCardCount(card.cardCountText);

    let dbSet = byCode.get(rawCode);
    if (!dbSet && !requireExactCode) dbSet = byCode.get(`${rawCode}C`);

    if (!dbSet) {
      review.push({
        sourceCode: card.slug,
        sourceUrl: `${ORIGIN}/expansions/${card.slug}`,
        sourceName: card.nameEn,
        logoUrl: card.logoUrl,
      });
      continue;
    }
    // Second, independent corroboration beyond the code match for the
    // fuzzier (zh-cn) case: reject if card counts disagree by more than 2
    // (small drift allowed for promo/subset counting differences) rather
    // than trusting a lookalike code alone.
    if (
      !requireExactCode &&
      dextcgCardCount != null &&
      dbSet.cardCount != null &&
      Math.abs(dextcgCardCount - dbSet.cardCount) > 2
    ) {
      review.push({
        sourceCode: card.slug,
        sourceUrl: `${ORIGIN}/expansions/${card.slug}`,
        sourceName: `${card.nameEn} (card-count mismatch: dextcg ${dextcgCardCount} vs DB ${dbSet.cardCount} for matched set ${dbSet.id})`,
        logoUrl: card.logoUrl,
      });
      continue;
    }
    if (dbSet.logoUrl) {
      alreadySet += 1;
      continue;
    }
    entries.push({
      setId: dbSet.id,
      logoUrl: card.logoUrl,
      nameEn: card.nameEn,
      sourceUrl: `${ORIGIN}/expansions/${card.slug}`,
      sourceName: card.nameEn,
    });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile: SetLogoFile = {
    gameId: "pokemon",
    sourceNote: `Crawled from ${url} on ${new Date().toISOString()} by crawl-pokemon-set-logos-dextcg.ts`,
    verified: false,
    generatedAt: new Date().toISOString(),
    entries,
  };
  const outPath = path.join(OUT_DIR, `dextcg-${lang === "jpn" ? "ja" : "cn"}.json`);
  fs.writeFileSync(outPath, JSON.stringify(outFile, null, 2));

  const reviewFile: SetLogoReviewFile = {
    gameId: "pokemon",
    note: `dextcg.com (${lang}) set cards with no confidently-matching pokemon:${dbPrefix}:<code> Set row. Never seeded.`,
    generatedAt: new Date().toISOString(),
    entries: review,
  };
  const reviewPath = path.join(OUT_DIR, `dextcg-${lang === "jpn" ? "ja" : "cn"}.review.json`);
  fs.writeFileSync(reviewPath, JSON.stringify(reviewFile, null, 2));

  console.log(`\nMatched (logoUrl currently null): ${entries.length}`);
  console.log(`Already had a logoUrl (left alone): ${alreadySet}`);
  console.log(`No confident match (see review file): ${review.length}`);
  console.log(`\nWrote ${path.relative(process.cwd(), outPath)}`);
  console.log(`Wrote ${path.relative(process.cwd(), reviewPath)}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
