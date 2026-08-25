/**
 * Generic, profile-driven HTML scraper for scripts/import-card-set.ts.
 *
 * Unlike every other scripts/crawl-*.ts (each hand-written against one
 * specific site's markup), this is deliberately data-driven: a JSON "import
 * profile" (scripts/data/import-profiles/*.json) declares which CSS
 * selectors map to which card fields for a given source page, so importing
 * a new set from a new site is "write a profile", not "write a new script".
 * See scripts/data/import-profiles/README.md for the full schema.
 *
 * Deliberately plain fetch(), not lib/polite-fetch.ts's throttled crawler:
 * that module is built for tens-of-thousands-of-requests id-space sweeps
 * against one host over many hours. A set-import page is a handful of
 * requests (often exactly one) against a page the user picked themselves,
 * so the priority here is a truthful User-Agent and clear errors, not a
 * rate limiter.
 */
import * as cheerio from "cheerio";

const USER_AGENT = "CardStorySetImport/1.0 (one-off card-set import; contact via repo)";

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status} ${res.statusText}) for ${url}`);
  }
  return res.text();
}

/** How to pull one value out of a matched element. */
export interface FieldSpec {
  /** CSS selector, relative to the card element (or the document root for a page-level field). Omitted = use the element itself. */
  selector?: string;
  /** "text" (default) | "html" | any HTML attribute name, e.g. "src", "href", "data-src". */
  attr?: string;
  /** Optional regex run against the extracted string; capture group `match` (default: group 1 if the pattern has one, else the whole match) replaces the value. */
  regex?: string;
  match?: number;
}

export interface CardFieldMap {
  name: FieldSpec;
  image?: FieldSpec;
  imageBack?: FieldSpec;
  number?: FieldSpec;
  rarity?: FieldSpec;
  artist?: FieldSpec;
  /** Sports imports only — maps to SportsCardItem.playerName. */
  player?: FieldSpec;
  /** Sports imports only — maps to SportsCardItem.teamName. */
  team?: FieldSpec;
  cardType?: FieldSpec;
  /** Sports imports only — maps to SportsCardItem.parallelName. */
  parallel?: FieldSpec;
  /** Sports imports only — maps to SportsCardItem.serialLimit, e.g. "99" or "1". */
  serialLimit?: FieldSpec;
  releaseDate?: FieldSpec;
  /** Also used, alongside provenance, as the page fetched for `imageFromDetail` below. */
  detailUrl?: FieldSpec;
  /**
   * Many checklist/gallery pages only show a small thumbnail per card, with
   * the real image (front, or hi-res) living on that card's own detail page.
   * If set, `fetchDetailImages` visits each card's `detailUrl` and extracts
   * an image with this spec (resolved against the detail page's document
   * root, same field-spec semantics as everything else). Requires
   * `fields.detailUrl` to also be set — no detailUrl, nothing to fetch.
   */
  imageFromDetail?: FieldSpec;
  /** Same idea as `imageFromDetail`, for a card back image. */
  imageBackFromDetail?: FieldSpec;
}

export interface ScrapedCard {
  name: string;
  imageUrl?: string;
  imageBackUrl?: string;
  number?: string;
  rarity?: string;
  artist?: string;
  player?: string;
  team?: string;
  cardType?: string;
  parallel?: string;
  serialLimit?: string;
  releaseDate?: string;
  detailUrl?: string;
  /** Which page this row was scraped from, for provenance. */
  sourceUrl: string;
}

export interface ScrapeSpec {
  /** Page(s) to scrape — every card across all pages is combined into one result list, in order. */
  sourceUrls: string[];
  /** CSS selector matching one repeating element per card, e.g. ".card-tile". Run scripts/import-card-set.ts's `scan` command against your URL to find this. */
  cardSelector: string;
  fields: CardFieldMap;
  /** Extracted once per page (from the document root, not per-card) and used to fill any card that has no releaseDate of its own — e.g. a checklist page with one release date printed at the top, shared by every row. */
  pageFields?: { releaseDate?: FieldSpec };
}

function extractOne(
  root: cheerio.Cheerio<any>,
  spec: FieldSpec | undefined,
  pageUrl: string
): string | undefined {
  if (!spec) return undefined;
  const el = spec.selector ? root.find(spec.selector).first() : root;
  if (el.length === 0) return undefined;

  let raw: string | null | undefined;
  if (!spec.attr || spec.attr === "text") raw = el.text();
  else if (spec.attr === "html") raw = el.html();
  else raw = el.attr(spec.attr);
  if (raw == null) return undefined;
  raw = raw.trim();
  if (!raw) return undefined;

  if (spec.regex) {
    const re = new RegExp(spec.regex);
    const m = re.exec(raw);
    if (!m) return undefined;
    const group = spec.match ?? (m.length > 1 ? 1 : 0);
    const captured = m[group]?.trim();
    if (!captured) return undefined;
    raw = captured;
  }

  // Resolve link/image-shaped attributes to absolute URLs so a page's
  // relative "src"/"href"/"data-src" still works once stored in the DB,
  // detached from the page it came from.
  if (spec.attr && (spec.attr === "src" || spec.attr === "href" || spec.attr.startsWith("data-"))) {
    try {
      raw = new URL(raw, pageUrl).href;
    } catch {
      // Not actually URL-shaped (e.g. a data-* attribute holding a rarity
      // code, not a link) — keep the raw value as-is.
    }
  }

  return raw;
}

export async function scrapeCards(spec: ScrapeSpec): Promise<ScrapedCard[]> {
  const out: ScrapedCard[] = [];
  for (const pageUrl of spec.sourceUrls) {
    const html = await fetchHtml(pageUrl);
    const $ = cheerio.load(html);
    const pageReleaseDate = extractOne($.root(), spec.pageFields?.releaseDate, pageUrl);

    const cardEls = $(spec.cardSelector);
    for (let i = 0; i < cardEls.length; i++) {
      const el = $(cardEls[i]);
      const name = extractOne(el, spec.fields.name, pageUrl);
      // No name = not a real card row (an ad slot or nav item the selector
      // happened to also match) — skip silently rather than emit a blank row.
      if (!name) continue;

      out.push({
        name,
        imageUrl: extractOne(el, spec.fields.image, pageUrl),
        imageBackUrl: extractOne(el, spec.fields.imageBack, pageUrl),
        number: extractOne(el, spec.fields.number, pageUrl),
        rarity: extractOne(el, spec.fields.rarity, pageUrl),
        artist: extractOne(el, spec.fields.artist, pageUrl),
        player: extractOne(el, spec.fields.player, pageUrl),
        team: extractOne(el, spec.fields.team, pageUrl),
        cardType: extractOne(el, spec.fields.cardType, pageUrl),
        parallel: extractOne(el, spec.fields.parallel, pageUrl),
        serialLimit: extractOne(el, spec.fields.serialLimit, pageUrl),
        releaseDate: extractOne(el, spec.fields.releaseDate, pageUrl) ?? pageReleaseDate,
        detailUrl: extractOne(el, spec.fields.detailUrl, pageUrl),
        sourceUrl: pageUrl,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Per-card detail-page image fetch — opt-in second pass for sites whose
// listing/checklist page only exposes a thumbnail (or no image at all),
// where the real card image lives on that card's own detail page.
// ---------------------------------------------------------------------------

export interface DetailImageFetchOptions {
  /** Skip cards that already have an imageUrl from the listing page. Default true. */
  onlyMissing?: boolean;
  /** Delay between detail-page requests, to be polite to the source site. Default 250ms. */
  delayMs?: number;
  /** Called after each attempted fetch, for a progress indicator. */
  onProgress?: (done: number, total: number) => void;
}

export interface DetailImageFetchResult {
  attempted: number;
  updatedFront: number;
  updatedBack: number;
  failed: { name: string; detailUrl: string; error: string }[];
}

/**
 * Mutates `cards` in place, filling `imageUrl` (and `imageBackUrl`) by
 * fetching each card's `detailUrl` and extracting per `fields.imageFromDetail`
 * / `fields.imageBackFromDetail`. Cards with no `detailUrl`, or with neither
 * spec set, are left untouched. One request per qualifying card — for a
 * large set this is the slow path, so it's always opt-in (only runs when a
 * profile sets one of these specs) and paced by `delayMs`.
 */
export async function fetchDetailImages(
  cards: ScrapedCard[],
  fields: Pick<CardFieldMap, "imageFromDetail" | "imageBackFromDetail">,
  opts: DetailImageFetchOptions = {}
): Promise<DetailImageFetchResult> {
  const { onlyMissing = true, delayMs = 250, onProgress } = opts;
  const result: DetailImageFetchResult = { attempted: 0, updatedFront: 0, updatedBack: 0, failed: [] };
  if (!fields.imageFromDetail && !fields.imageBackFromDetail) return result;

  const targets = cards.filter(
    (c) => c.detailUrl && (!onlyMissing || !c.imageUrl || (fields.imageBackFromDetail && !c.imageBackUrl))
  );

  for (let i = 0; i < targets.length; i++) {
    const card = targets[i];
    const detailUrl = card.detailUrl!;
    result.attempted++;
    try {
      const html = await fetchHtml(detailUrl);
      const $ = cheerio.load(html);
      if (fields.imageFromDetail && (!onlyMissing || !card.imageUrl)) {
        const url = extractOne($.root(), fields.imageFromDetail, detailUrl);
        if (url) {
          card.imageUrl = url;
          result.updatedFront++;
        }
      }
      if (fields.imageBackFromDetail && (!onlyMissing || !card.imageBackUrl)) {
        const url = extractOne($.root(), fields.imageBackFromDetail, detailUrl);
        if (url) {
          card.imageBackUrl = url;
          result.updatedBack++;
        }
      }
    } catch (err) {
      result.failed.push({ name: card.name, detailUrl, error: err instanceof Error ? err.message : String(err) });
    }
    onProgress?.(i + 1, targets.length);
    if (delayMs > 0 && i < targets.length - 1) await new Promise((r) => setTimeout(r, delayMs));
  }

  return result;
}

// ---------------------------------------------------------------------------
// `scan` diagnostic — not used by scrapeCards() itself. Helps a human find
// cardSelector by ranking repeated tag+class combinations on the page, since
// a card-list page is almost always N copies of the same element.
// ---------------------------------------------------------------------------

export interface ScanCandidate {
  selector: string;
  count: number;
  sampleText: string;
}

const SKIP_TAGS = new Set(["html", "head", "body", "script", "style", "svg", "path", "meta", "link", "noscript"]);

export function scanStructure(html: string, minCount = 4, limit = 20): ScanCandidate[] {
  const $ = cheerio.load(html);
  const counts = new Map<string, { count: number; sample: cheerio.Cheerio<any> }>();

  $("*").each((_, node) => {
    const tag = "tagName" in node ? (node.tagName as string)?.toLowerCase() : undefined;
    if (!tag || SKIP_TAGS.has(tag)) return;
    const el = $(node);
    const classAttr = el.attr("class");
    // Only the first two classes: real card tiles are almost always tagged
    // with a stable "type" class plus a few layout utility classes, and
    // folding in every utility class would fragment one real pattern into
    // dozens of near-duplicate signatures.
    const classes = classAttr ? "." + classAttr.trim().split(/\s+/).slice(0, 2).join(".") : "";
    const selector = `${tag}${classes}`;
    const entry = counts.get(selector);
    if (entry) entry.count += 1;
    else counts.set(selector, { count: 1, sample: el });
  });

  return [...counts.entries()]
    .filter(([, v]) => v.count >= minCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([selector, v]) => ({
      selector,
      count: v.count,
      sampleText: v.sample.text().trim().replace(/\s+/g, " ").slice(0, 120),
    }));
}

/** "Charizard VMAX" -> "charizard-vmax". Used to derive a stable id when a source page has no per-card number. */
export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
