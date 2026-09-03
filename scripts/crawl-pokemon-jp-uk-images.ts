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
import * as path from "node:path";
import { db } from "@/lib/db";
import { resolvePokemonCardNameEn } from "@/lib/games/pokemon/card-name-en";
import { createPoliteFetcher } from "./lib/polite-fetch";
import { type CrawlRecord } from "./lib/crawl-cache";
import { decodeHtmlEntities, normalizeNameAsciiEn } from "./lib/normalize";
import { runScript, usage, verb } from "./lib/cli";
import {
  deriveFromCache,
  withResumableCache,
  writeDeriveOutput,
  type CardImageSource,
  type CatalogRow,
} from "./lib/source-pipeline";

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
    const nameEn = rawAlt ? decodeHtmlEntities(rawAlt) : null;
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
  // No numeric id from the source — mint one per href, stable across reruns
  // as long as the same hrefs keep appearing (order-independent, keyed by
  // string then hashed to an int for CrawlRecord's `id: number` contract).
  const idFor = (href: string) => {
    let h = 0;
    for (let i = 0; i < href.length; i++) h = (Math.imul(h, 31) + href.charCodeAt(i)) | 0;
    return h;
  };

  await withResumableCache<JpUkRecord>(CACHE_NAME, async (cache) => {
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
  });
}

const source: CardImageSource<JpUkRecord> = {
  name: "pokemon-jp-uk",
  cacheName: CACHE_NAME,
  lang: LANG,
  outDir: OUT_DIR,
  sourceNote:
    "Japanese card images (Base Set through Neo Destiny only) from japanesepokemoncards.uk, a UK " +
    "reseller of vintage Japanese singles, crawled offline by scripts/crawl-pokemon-jp-uk-images.ts. " +
    "Image URLs are hotlinked from the seller's own site, never re-hosted — note these are per-listing " +
    "condition photos, not a stable reference database, so a URL can go stale if that card sells. Every " +
    "entry passed a set-code/number match against our catalog plus an English-name guard (resolved from " +
    "the catalog's Japanese name via resolvePokemonCardNameEn, since this source's own Japanese text is " +
    "machine-transliterated and untrustworthy).",
  reviewNote: "Crawled japanesepokemoncards.uk cards that did NOT pass the mapping guards. Never seeded.",
  // This source has no detail-page fetch and only ever caches status 200, so
  // unlike the id-sweep crawlers there is no non-200 tier to filter out.
  isFetched: () => true,
  isParseable: (r) => Boolean(r.number && r.fileSetCode && r.nameEn),
  sourceUrl: (r) => `${ORIGIN}${r.href}`,
  provenance: (r) => ({
    sourceName: r.nameEn ?? "",
    sourceSetLabel: r.fileSetCode ?? r.dbSetCode,
    sourceNumber: r.number ?? "",
  }),
  // dbSetCode is our own code, carried through the crawl from the hardcoded
  // SETS table, so a lookup miss is never an unknown set.
  sourceSetCode: () => null,
  // The image filename's own set code should equal the DB set code we
  // fetched this listing under — cheap independent check that the
  // filename-parsing regex isn't drifting.
  preCheck: (r) => (r.fileSetCode !== r.dbSetCode ? { reason: "ambiguous-set" } : null),
  // The filename is already zero-padded, so unlike the other crawlers there
  // is no padding variant to try.
  candidates: (r) => [`${LANG}:${r.dbSetCode}-${r.number}`],
  // Name guard — see the module doc for why this compares resolved English
  // names rather than native Japanese text like the other crawlers. Never
  // loosen it to raise the fill rate.
  nameGuard: (rec, row) => {
    const expectedNameEn = resolvePokemonCardNameEn(row.name, "JP");
    if (!expectedNameEn) {
      return { ok: false, reason: "unresolved-name-guard", catalogName: row.name };
    }
    return normalizeNameAsciiEn(expectedNameEn) === normalizeNameAsciiEn(rec.nameEn!)
      ? { ok: true }
      : { ok: false, reason: "name-mismatch", catalogName: row.name };
  },
  imageUrls: (r) => {
    const url = `${ORIGIN}/images/${r.slug}/${r.fileSetCode}-${r.number}.jpg`;
    return { small: url, large: url };
  },
};

async function derive() {
  const catalog = await db.catalogItem.findMany({
    where: { gameId: "pokemon", externalId: { startsWith: `${LANG}:` } },
    select: { externalId: true, name: true, imageSmallUrl: true },
  });
  const byExternalId = new Map<string, CatalogRow>(catalog.map((c) => [c.externalId, c]));

  writeDeriveOutput(source, deriveFromCache({ source, byExternalId }));
}

async function main() {
  const cmd = verb();
  if (cmd === "crawl") await crawl();
  else if (cmd === "derive") await derive();
  else usage("Usage: crawl-pokemon-jp-uk-images.ts <crawl|derive>");
}

void runScript(main, () => db.$disconnect());
