/**
 * Backfills images for Simplified Chinese (zh-cn) Pokémon cards from the
 * Hong Kong edition of the official Pokémon Asia card database.
 *
 * Why this exists: tcgdex — our provider for every non-English Pokémon card —
 * has no asset for our zh-cn cards, so they render as placeholders.
 * asia.pokemon-card.com/hk/ is the publisher's own database and does have
 * them, structured identically to the /tw/ site this repo already backfills
 * from (see crawl-pokemon-tw-images.ts).
 *
 * The catch: the HK site itself serves Traditional Chinese card text and
 * uses Hong Kong's own set-code convention, which is NOT the same as the
 * C-prefixed set-code convention tcgdex uses for most zh-cn sets (e.g.
 * "CSMPiC", "CSV1C"). For the handful of zh-cn sets that are actually
 * missing images, the codes happen to look like HK's own SV-style codes
 * (e.g. "SV7", "SV8a") — but a matching code string is not proof it's the
 * same physical set, so this crawler never trusts the code alone. Before
 * enumerating any set's cards, it fetches one sample card from that set and
 * compares the set name printed on the HK page (from the "收錄商品" /
 * "擴充包「…」" link) against our catalog's Set.name. A set that doesn't
 * verify is skipped and reported — never guessed. Cards that DO verify are
 * hotlinked as-is; the art is correct, but the card text on the image itself
 * is Traditional Chinese, not Simplified — a deliberate tradeoff, not a bug.
 *
 * Only the URL is stored; images are hotlinked from the publisher's CDN and
 * never re-hosted. Run from a dev machine, never from a request or a cron.
 *
 *   npx tsx scripts/crawl-pokemon-cn-images.ts crawl [--sets=SV7,SV8a]
 *   npx tsx scripts/crawl-pokemon-cn-images.ts derive
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as cheerio from "cheerio";
import { db } from "../src/lib/db";
import { createPoliteFetcher, CrawlAbortedError } from "./lib/polite-fetch";
import { openCrawlCache, type CrawlRecord } from "./lib/crawl-cache";
import type {
  CardImageEntry,
  CardImageFile,
  CardImageReviewEntry,
  CardImageReviewFile,
} from "./data/card-images/types";

const ORIGIN = "https://asia.pokemon-card.com";
const LANG = "zh-cn";
const CACHE_NAME = "pokemon-cn-crawl";
const OUT_DIR = path.join(process.cwd(), "scripts", "data", "card-images");

interface CnRecord extends CrawlRecord {
  /** Set code the page itself reports, e.g. "SV7" — authoritative over the query. */
  setCode: string | null;
  /** Collector number as printed, e.g. "001/102". */
  collector: string | null;
  name: string | null;
  /** Set name printed on the page's "擴充包「…」" link, used to verify set identity. */
  setNameOnPage: string | null;
}

const politeGet = createPoliteFetcher();

function imageUrlForId(id: number): string {
  return `${ORIGIN}/hk/card-img/hk${String(id).padStart(8, "0")}.png`;
}

function detailUrlForId(id: number): string {
  return `${ORIGIN}/hk/card-search/detail/${id}/`;
}

function listUrl(code: string, page: number): string {
  return `${ORIGIN}/hk/card-search/list/?expansionCodes=${encodeURIComponent(code)}&pageNo=${page}`;
}

/** Set codes that still have cards without an image. */
async function targetSetCodes(): Promise<string[]> {
  const rows = await db.set.findMany({
    where: { id: { startsWith: `pokemon:${LANG}:` }, items: { some: { imageSmallUrl: null } } },
    select: { code: true },
  });
  return rows.map((r) => r.code.replace(/^zh-cn:/, "")).filter(Boolean);
}

async function enumerateSet(code: string): Promise<number[]> {
  const ids: number[] = [];
  for (let page = 1; ; page++) {
    const res = await politeGet(listUrl(code, page));
    if (res.status !== 200) break;
    const found = [...res.body.matchAll(/href="\/hk\/card-search\/detail\/(\d+)\/"/g)].map((m) =>
      Number(m[1])
    );
    if (found.length === 0) break;
    ids.push(...found);

    // "共 N 頁" — total page count, so we stop without a wasted probe request.
    const total = Number(/共\s*(\d+)\s*頁/.exec(res.body)?.[1] ?? 0);
    if (total > 0 && page >= total) break;
    if (page > 200) break; // paranoia against a pagination loop
  }
  return [...new Set(ids)];
}

function parseDetail(htmlBody: string): {
  setCode: string | null;
  collector: string | null;
  name: string | null;
  setNameOnPage: string | null;
} {
  const $ = cheerio.load(htmlBody);

  // The "收錄商品" (contained in) link carries the official expansion code AND
  // its display name — the code is authoritative for enumeration, but the
  // name is what lets us verify this HK set is actually our zh-cn set before
  // trusting the code match at all.
  const link = $('a[href*="expansionCodes="]').first();
  const href = link.attr("href") ?? "";
  const setCode = /expansionCodes=([^&"]+)/.exec(href)?.[1] ?? null;

  // e.g. "擴充包「星晶奇跡」" or "戰術牌組「超級噴火龍Xex」" — strip the
  // wrapper, keep the bracketed name.
  const linkText = link.text().trim();
  const setNameOnPage = /[「『](.+)[」』]/.exec(linkText)?.[1]?.trim() ?? null;

  const collector = $(".collectorNumber").first().text().trim() || null;

  // <h1 class="pageHeader cardDetail"><span class="evolveMarker">基礎</span> 芭瓢蟲 </h1>
  const h1 = $("h1.pageHeader").first();
  h1.find("span").remove();
  const name = h1.text().trim() || null;

  return { setCode, collector, name, setNameOnPage };
}

/** NFKC + strip whitespace/punctuation, so formatting variants don't fail a name guard. */
function normalizeName(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\s　]/g, "")
    .replace(/[·・.,'’"“”\-—–~〜!?！？:：;；()（）「」『』【】[\]]/g, "")
    .toLowerCase();
}

/**
 * Fetches one sample card for `code` and checks its printed set name against
 * our catalog Set.name. Returns null (and logs why) if the set can't be
 * verified — callers must not enumerate/crawl the set in that case.
 */
async function verifySetIdentity(
  code: string,
  catalogSetName: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const res = await politeGet(listUrl(code, 1));
  if (res.status !== 200) return { ok: false, reason: `list page returned ${res.status}` };

  const sampleId = [...res.body.matchAll(/href="\/hk\/card-search\/detail\/(\d+)\/"/g)][0]?.[1];
  if (!sampleId) return { ok: false, reason: "no cards found for this code on HK" };

  const detailRes = await politeGet(detailUrlForId(Number(sampleId)));
  if (detailRes.status !== 200) return { ok: false, reason: `detail page returned ${detailRes.status}` };

  const { setNameOnPage } = parseDetail(detailRes.body);
  if (!setNameOnPage) return { ok: false, reason: "couldn't read a set name off the sample card" };

  if (normalizeName(setNameOnPage) !== normalizeName(catalogSetName)) {
    return {
      ok: false,
      reason: `HK set name "${setNameOnPage}" does not match catalog Set.name "${catalogSetName}"`,
    };
  }
  return { ok: true };
}

async function crawl(only?: string[]) {
  const cache = openCrawlCache<CnRecord>(CACHE_NAME);

  const setRows = await db.set.findMany({
    where: { id: { startsWith: `pokemon:${LANG}:` }, items: { some: { imageSmallUrl: null } } },
    select: { code: true, name: true },
  });
  const catalogNameByCode = new Map(setRows.map((r) => [r.code.replace(/^zh-cn:/, ""), r.name]));

  const codes = only?.length ? only : await targetSetCodes();
  console.log(`Sets to consider: ${codes.length}`);

  const verified: string[] = [];
  const skipped: { code: string; reason: string }[] = [];

  try {
    for (const [i, code] of codes.entries()) {
      const catalogName = catalogNameByCode.get(code);
      if (!catalogName) {
        skipped.push({ code, reason: "no matching zh-cn Set row for this code" });
        continue;
      }

      const verdict = await verifySetIdentity(code, catalogName);
      if (!verdict.ok) {
        console.log(`[${i + 1}/${codes.length}] ${code}: SKIPPED — ${verdict.reason}`);
        skipped.push({ code, reason: verdict.reason });
        continue;
      }
      verified.push(code);

      const ids = await enumerateSet(code);
      const todo = ids.filter((id) => !cache.seen.has(id));
      console.log(
        `[${i + 1}/${codes.length}] ${code}: verified ("${catalogName}"), ${ids.length} cards, ${todo.length} to fetch`
      );

      for (const id of todo) {
        const res = await politeGet(detailUrlForId(id));
        if (res.status !== 200) {
          cache.append({ id, status: res.status, setCode: null, collector: null, name: null, setNameOnPage: null });
          continue;
        }
        const parsed = parseDetail(res.body);
        cache.append({ id, status: 200, ...parsed });
      }
    }
  } catch (err) {
    if (err instanceof CrawlAbortedError) {
      console.error(`\n${err.message}\nProgress is cached — rerun to resume.`);
    } else throw err;
  } finally {
    cache.close();
  }

  console.log(`\nVerified sets crawled: ${verified.length} (${verified.join(", ") || "none"})`);
  console.log(`Skipped sets: ${skipped.length}`);
  for (const s of skipped) console.log(`  - ${s.code}: ${s.reason}`);
  console.log(`\nCached ${cache.seen.size} ids total.`);
}

async function derive() {
  const cache = openCrawlCache<CnRecord>(CACHE_NAME);
  const found = cache.all().filter((r) => r.status === 200);
  // See crawl-pokemon-ja-images.ts — unparseable pages go to review, not the bin.
  const records = found.filter((r) => r.setCode && r.collector);
  const unparseable = found.filter((r) => !(r.setCode && r.collector));
  cache.close();
  console.log(`Cards found: ${found.length} (${records.length} parseable, ${unparseable.length} not)`);

  const catalog = await db.catalogItem.findMany({
    where: { gameId: "pokemon", externalId: { startsWith: `${LANG}:` } },
    select: { externalId: true, name: true, imageSmallUrl: true },
  });
  const byExternalId = new Map(catalog.map((c) => [c.externalId, c]));

  let alreadyHadImage = 0;
  const entries: CardImageEntry[] = [];
  const review: CardImageReviewEntry[] = unparseable.map((r) => ({
    reason: "missing-page-fields" as const,
    sourceId: r.id,
    sourceUrl: detailUrlForId(r.id),
    sourceName: r.name ?? "",
    sourceSetLabel: r.setCode ?? "",
    sourceNumber: r.collector ?? "",
  }));

  for (const rec of records) {
    const sourceUrl = detailUrlForId(rec.id);
    const rawNumber = (rec.collector ?? "").split("/")[0]?.trim() ?? "";
    const base = {
      sourceId: rec.id,
      sourceUrl,
      sourceName: rec.name ?? "",
      sourceSetLabel: rec.setCode ?? "",
      sourceNumber: rec.collector ?? "",
    };

    // Numbers are stored zero-padded to 3 (zh-cn:SV7-001), with a rare
    // unpadded promo — try both rather than guessing.
    const candidates = [
      `${LANG}:${rec.setCode}-${rawNumber.padStart(3, "0")}`,
      `${LANG}:${rec.setCode}-${rawNumber}`,
    ];
    const externalId = candidates.find((c) => byExternalId.has(c));

    if (!externalId) {
      review.push({
        ...base,
        reason: byExternalId.size ? "no-catalog-row" : "unknown-set-code",
        candidateExternalId: candidates[0],
      });
      continue;
    }

    const row = byExternalId.get(externalId)!;

    // Guard: the name on the page must be the name in our catalog. This is the
    // check that independently catches a wrong set code, a bad number, or the
    // page structure drifting — never loosen it to raise the fill rate.
    if (!rec.name || normalizeName(rec.name) !== normalizeName(row.name)) {
      review.push({
        ...base,
        reason: "name-mismatch",
        candidateExternalId: externalId,
        catalogName: row.name,
      });
      continue;
    }

    if (row.imageSmallUrl) {
      alreadyHadImage += 1; // provider already supplied art; leave it alone
      continue;
    }

    const url = imageUrlForId(rec.id);
    entries.push({
      externalId,
      imageSmallUrl: url,
      imageLargeUrl: url,
      sourceUrl,
      sourceName: rec.name,
    });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out: CardImageFile = {
    gameId: "pokemon",
    sourceNote:
      "Simplified Chinese (zh-cn) card images sourced from the Hong Kong edition of the " +
      "official Pokémon Asia card database (asia.pokemon-card.com/hk/), crawled offline by " +
      "scripts/crawl-pokemon-cn-images.ts. Caveat: the HK site itself displays Traditional " +
      "Chinese card text, so the art is correct but the text rendered on the image is " +
      "Traditional, not Simplified. Every entry belongs to a set whose HK-printed set name " +
      "was independently verified against our catalog Set.name before any of its cards were " +
      "crawled (never assumed from a matching set-code string alone), and every card entry " +
      "also passed a catalog-row and card-name match. Image URLs are derived from each card's " +
      "internal id and hotlinked, never re-hosted.",
    verified: false,
    generatedAt: new Date().toISOString(),
    entries,
  };
  fs.writeFileSync(path.join(OUT_DIR, "pokemon-cn.json"), JSON.stringify(out, null, 2));

  const reviewOut: CardImageReviewFile = {
    gameId: "pokemon",
    note: "Crawled zh-cn cards that did NOT pass the mapping guards. Never seeded.",
    generatedAt: new Date().toISOString(),
    entries: review,
  };
  fs.writeFileSync(path.join(OUT_DIR, "pokemon-cn.review.json"), JSON.stringify(reviewOut, null, 2));

  const byReason = review.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nMapped:   ${entries.length}`);
  console.log(`Had art:  ${alreadyHadImage} (already sourced from the provider — untouched)`);
  console.log(`Review:   ${review.length}`, byReason);
  console.log(`\nWrote pokemon-cn.json (verified: false — review, then flip it).`);
}

async function main() {
  const cmd = process.argv[2];
  const setsArg = process.argv.find((a) => a.startsWith("--sets="));
  const only = setsArg?.slice("--sets=".length).split(",").filter(Boolean);

  if (cmd === "crawl") await crawl(only);
  else if (cmd === "derive") await derive();
  else {
    console.error("Usage: crawl-pokemon-cn-images.ts <crawl|derive> [--sets=SV7,SV8a]");
    process.exit(1);
  }
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
