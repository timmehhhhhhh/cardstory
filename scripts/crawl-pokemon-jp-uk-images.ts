/**
 * Backfills images for the earliest Japanese Pokémon sets — Base Set through
 * Neo Destiny — from japanesepokemoncards.uk, a UK reseller of vintage
 * Japanese singles.
 *
 * Why this source: pokemon-card.com's id space (crawl-pokemon-ja-images.ts)
 * doesn't reach cards this old at all, and pokellector
 * (crawl-pokemon-jp-pokellector-images.ts) has gaps here too. This site's
 * image filenames happen to already encode CardStory's own
 * `<setCode>-<number>` convention (e.g. "/images/base-set/PMCG1-021.jpg" ==
 * `ja:PMCG1-021`, verified against the DB), which makes it unusually cheap to
 * crawl: one page per set, no id sweep, no per-card detail-page fetches — the
 * listing page already renders every card's image, English name and link.
 *
 * NOTE on provenance: unlike the other sources in this family, this is a
 * reseller's storefront, not a reference database — its own Terms of Service
 * say every image is a condition photo of the specific physical card
 * currently listed for sale, not a stable scan. Images are hotlinked (never
 * re-hosted), same policy as the other crawlers, but be aware a given URL can
 * go stale if that card sells and the listing is replaced. Every row written
 * here is identifiable by hostname so the whole set can be dropped with one
 * statement if that call is ever revisited.
 *
 * Scope is deliberately only the 8 sets whose numbering matches CardStory's:
 * Base Set/Jungle/Fossil/Team Rocket/Neo Genesis/Neo Discovery/Neo
 * Revelation/Neo Destiny. Gym Heroes/Gym Challenge/City Gym Decks are
 * excluded — this site splits Japan's single リーダーズスタジアム release
 * into an English-partitioned structure with its own numbering that does not
 * correspond to CardStory's PMCG5/PMCG6 sets (verified: the site's "Brock
 * #15" is not `ja:PMCG5-015`), and there's no nameEn data on those
 * trainer-possessive cards to fall back to a name-only match.
 *
 * Also unlike the other crawlers: this site's displayed "Japanese" text is
 * machine-transliterated garbage, not the real native name (e.g. its
 * Charizard reads "カリザード", not the real リザードン), so it can't be used
 * as this crawler's name guard. Instead the guard resolves the catalog's real
 * Japanese name to an expected English name via resolvePokemonCardNameEn and
 * compares that to the site's (trustworthy) English name — a card whose name
 * doesn't resolve that way (mostly Trainer/Item/Energy cards outside the
 * curated translation table) is routed to review rather than trusted blind.
 *
 *   npx tsx scripts/crawl-pokemon-jp-uk-images.ts crawl
 *   npx tsx scripts/crawl-pokemon-jp-uk-images.ts derive
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "../src/lib/db";
import { resolvePokemonCardNameEn } from "../src/lib/games/pokemon/card-name-en";
import { createPoliteFetcher, CrawlAbortedError } from "./lib/polite-fetch";
import { openCrawlCache, type CrawlRecord } from "./lib/crawl-cache";
import type {
  CardImageEntry,
  CardImageFile,
  CardImageReviewEntry,
  CardImageReviewFile,
} from "./data/card-images/types";

const ORIGIN = "https://japanesepokemoncards.uk";
const LANG = "ja";
const CACHE_NAME = "pokemon-jp-uk-crawl";
const OUT_DIR = path.join(process.cwd(), "scripts", "data", "card-images");

/** The only sets whose numbering on this site matches CardStory's — see the module doc. */
const SETS: { slug: string; dbSetCode: string }[] = [
  { slug: "base-set", dbSetCode: "PMCG1" },
  { slug: "jungle", dbSetCode: "PMCG2" },
  { slug: "fossil", dbSetCode: "PMCG3" },
  { slug: "team-rocket", dbSetCode: "PMCG4" },
  { slug: "neo-genesis", dbSetCode: "neo1" },
  { slug: "neo-discovery", dbSetCode: "neo2" },
  { slug: "neo-revelation", dbSetCode: "neo3" },
  { slug: "neo-destiny", dbSetCode: "neo4" },
];

/** Kept separate from JpUkRecord: CrawlRecord's index signature makes Omit<> on
 *  the combined type collapse to `unknown`, which loses these field types (see
 *  the equivalent comment in crawl-pokemon-ja-images.ts). */
interface JpUkCardFields {
  slug: string;
  dbSetCode: string;
  /** Card detail page path, e.g. "/base-set/charizard" — this source's only stable key (no numeric id). */
  href: string;
  /** Collector number parsed from the image filename, e.g. "021". */
  number: string | null;
  /** Set code parsed from the image filename, e.g. "PMCG1" — cross-checked against dbSetCode, not assumed equal. */
  fileSetCode: string | null;
  /** The site's <img alt>, an English name — the only trustworthy name text this source prints. */
  nameEn: string | null;
}

interface JpUkRecord extends CrawlRecord, JpUkCardFields {}

const politeGet = createPoliteFetcher();

/** "/_next/image?url=%2Fimages%2Fbase-set%2FPMCG1-021.jpg&w=3840&q=75" -> "/images/base-set/PMCG1-021.jpg". */
function rawImagePath(src: string): string | null {
  const proxied = /^\/_next\/image\?url=([^&]+)/.exec(src);
  const encoded = proxied ? proxied[1] : src;
  try {
    const decoded = decodeURIComponent(encoded);
    return decoded.startsWith("/images/") ? decoded : null;
  } catch {
    return null;
  }
}

/** "/images/base-set/PMCG1-021.jpg" -> { setCode: "PMCG1", number: "021" }. */
function parseImageFilename(imgPath: string): { setCode: string; number: string } | null {
  const m = /\/([A-Za-z0-9]+)-(\d+)\.jpg$/.exec(imgPath);
  return m ? { setCode: m[1], number: m[2] } : null;
}

/** The only entities this source's alt text actually uses (apostrophes in names like Farfetch'd). */
const HTML_ENTITIES: Record<string, string> = {
  "&#x27;": "'",
  "&#39;": "'",
  "&quot;": '"',
  "&amp;": "&",
};
function decodeEntities(s: string): string {
  return s.replace(/&(#x27|#39|quot|amp);/g, (m) => HTML_ENTITIES[m] ?? m);
}

function parseListing(slug: string, dbSetCode: string, htmlBody: string): JpUkCardFields[] {
  const out: JpUkCardFields[] = [];
  // <a ... href="/base-set/charizard" ...> ... <img alt="Charizard" src="..."> ... </a>
  const anchorRe = new RegExp(`<a[^>]+href="(/${slug}/[a-z0-9-]+)"[^>]*>([\\s\\S]*?)</a>`, "g");
  for (const anchor of htmlBody.matchAll(anchorRe)) {
    const href = anchor[1];
    const inner = anchor[2];
    const imgTag = /<img\b[^>]*>/.exec(inner)?.[0];
    if (!imgTag) continue; // "No image" placeholder card — nothing to crawl
    const rawAlt = /\balt="([^"]*)"/.exec(imgTag)?.[1];
    const nameEn = rawAlt ? decodeEntities(rawAlt) : null;
    const src = /\bsrc="([^"]*)"/.exec(imgTag)?.[1] ?? null;
    if (!src) continue;

    const raw = rawImagePath(src);
    const parsed = raw ? parseImageFilename(raw) : null;

    out.push({
      slug,
      dbSetCode,
      href,
      number: parsed?.number ?? null,
      fileSetCode: parsed?.setCode ?? null,
      nameEn,
    });
  }
  return out;
}

async function crawl() {
  const cache = openCrawlCache<JpUkRecord>(CACHE_NAME);
  // No numeric id from the source — mint one per href, stable across reruns
  // as long as the same hrefs keep appearing (order-independent, keyed by
  // string then hashed to an int for CrawlRecord's `id: number` contract).
  const idFor = (href: string) => {
    let h = 0;
    for (let i = 0; i < href.length; i++) h = (Math.imul(h, 31) + href.charCodeAt(i)) | 0;
    return h;
  };

  try {
    for (const { slug, dbSetCode } of SETS) {
      const res = await politeGet(`${ORIGIN}/${slug}`);
      if (res.status !== 200) {
        console.log(`${slug}: GET -> ${res.status}, skipping`);
        continue;
      }
      const cards = parseListing(slug, dbSetCode, res.body);
      console.log(`${slug} (${dbSetCode}): ${cards.length} cards with images`);
      for (const card of cards) {
        cache.append({ id: idFor(card.href), status: 200, ...card });
      }
    }
  } catch (err) {
    if (err instanceof CrawlAbortedError) {
      console.error(`\n${err.message}\nProgress is cached — rerun to resume.`);
    } else throw err;
  } finally {
    cache.close();
  }
  console.log(`Cached ${cache.seen.size} cards total.`);
}

/** Case/punctuation-insensitive English-name compare — apostrophes, hyphens and ♂/♀ vary in printed casing/spacing across sources.
 *  Also drops a leading "Basic " — resolvePokemonCardNameEn's energy-card translations say "Basic Grass Energy",
 *  this source's alt text just says "Grass Energy"; both name the same card, so this isn't a guard-loosening,
 *  it's normalizing a known, systematic naming-convention difference between the two sources. */
function normalizeNameEn(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/^basic\s+/i, "")
    .replace(/[\s]/g, "")
    .replace(/['’"“”\-–—.,]/g, "")
    .toLowerCase();
}

async function derive() {
  const cache = openCrawlCache<JpUkRecord>(CACHE_NAME);
  const all = cache.all();
  cache.close();

  const catalog = await db.catalogItem.findMany({
    where: { gameId: "pokemon", externalId: { startsWith: `${LANG}:` } },
    select: { externalId: true, name: true, imageSmallUrl: true },
  });
  const byExternalId = new Map(catalog.map((c) => [c.externalId, c]));

  let alreadyHadImage = 0;
  const entries: CardImageEntry[] = [];
  const review: CardImageReviewEntry[] = [];

  for (const rec of all) {
    const base = {
      sourceId: rec.id,
      sourceUrl: `${ORIGIN}${rec.href}`,
      sourceName: rec.nameEn ?? "",
      sourceSetLabel: rec.fileSetCode ?? rec.dbSetCode,
      sourceNumber: rec.number ?? "",
    };

    if (!rec.number || !rec.fileSetCode || !rec.nameEn) {
      review.push({ ...base, reason: "missing-page-fields" });
      continue;
    }

    // The image filename's own set code should equal the DB set code we
    // fetched this listing under — cheap independent check that the
    // filename-parsing regex isn't drifting.
    if (rec.fileSetCode !== rec.dbSetCode) {
      review.push({ ...base, reason: "ambiguous-set" });
      continue;
    }

    const externalId = `${LANG}:${rec.dbSetCode}-${rec.number}`;
    const row = byExternalId.get(externalId);
    if (!row) {
      review.push({ ...base, reason: "no-catalog-row", candidateExternalId: externalId });
      continue;
    }

    // Name guard — see the module doc for why this compares resolved
    // English names rather than native Japanese text like the other
    // crawlers. Never loosen it to raise the fill rate.
    const expectedNameEn = resolvePokemonCardNameEn(row.name, "JP");
    if (!expectedNameEn) {
      review.push({ ...base, reason: "unresolved-name-guard", candidateExternalId: externalId, catalogName: row.name });
      continue;
    }
    if (normalizeNameEn(expectedNameEn) !== normalizeNameEn(rec.nameEn)) {
      review.push({ ...base, reason: "name-mismatch", candidateExternalId: externalId, catalogName: row.name });
      continue;
    }

    if (row.imageSmallUrl) {
      alreadyHadImage += 1; // provider already supplied art; leave it alone
      continue;
    }

    const url = `${ORIGIN}/images/${rec.slug}/${rec.fileSetCode}-${rec.number}.jpg`;
    entries.push({
      externalId,
      imageSmallUrl: url,
      imageLargeUrl: url,
      sourceUrl: base.sourceUrl,
      // The site's Japanese text is machine-transliterated, not the real
      // native name (see module doc) — its English name is what actually
      // gated this row, so that's recorded here instead.
      sourceName: rec.nameEn,
    });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out: CardImageFile = {
    gameId: "pokemon",
    sourceNote:
      "Japanese card images (Base Set through Neo Destiny only) from japanesepokemoncards.uk, a UK " +
      "reseller of vintage Japanese singles, crawled offline by scripts/crawl-pokemon-jp-uk-images.ts. " +
      "Image URLs are hotlinked from the seller's own site, never re-hosted — note these are per-listing " +
      "condition photos, not a stable reference database, so a URL can go stale if that card sells. Every " +
      "entry passed a set-code/number match against our catalog plus an English-name guard (resolved from " +
      "the catalog's Japanese name via resolvePokemonCardNameEn, since this source's own Japanese text is " +
      "machine-transliterated and untrustworthy).",
    verified: false,
    generatedAt: new Date().toISOString(),
    entries,
  };
  fs.writeFileSync(path.join(OUT_DIR, "pokemon-jp-uk.json"), JSON.stringify(out, null, 2));

  const reviewOut: CardImageReviewFile = {
    gameId: "pokemon",
    note: "Crawled japanesepokemoncards.uk cards that did NOT pass the mapping guards. Never seeded.",
    generatedAt: new Date().toISOString(),
    entries: review,
  };
  fs.writeFileSync(path.join(OUT_DIR, "pokemon-jp-uk.review.json"), JSON.stringify(reviewOut, null, 2));

  const byReason = review.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nMapped:   ${entries.length}`);
  console.log(`Had art:  ${alreadyHadImage} (already sourced from the provider — untouched)`);
  console.log(`Review:   ${review.length}`, byReason);
  console.log(`\nWrote pokemon-jp-uk.json (verified: false — review, then flip it).`);
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === "crawl") await crawl();
  else if (cmd === "derive") await derive();
  else {
    console.error("Usage: crawl-pokemon-jp-uk-images.ts <crawl|derive>");
    process.exit(1);
  }
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
