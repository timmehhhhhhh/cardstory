/**
 * Name normalizers and entity decoding shared by the source crawlers.
 *
 * There is deliberately MORE THAN ONE normalizer here. Four crawlers
 * (ja/tw/cn/jp-pokellector) previously carried byte-identical copies of
 * `normalizeNameCjk`, and collapsing those is a pure deduplication. The other
 * two are genuinely different in what they consider equal, and merging them
 * would silently change which source image gets attached to which card — the
 * one failure mode this whole pipeline exists to prevent. So they stay
 * separate, named for the comparison they perform rather than the site that
 * happens to use them.
 *
 * If you are adding a source: reach for normalizeNameCjk first. Only add a new
 * normalizer if you can name a systematic, verified naming-convention
 * difference the existing ones don't cover — and write that reason down.
 */

/**
 * NFKC + strip whitespace/punctuation, so formatting variants don't fail the
 * name guard. The default for comparing native-script (JA/zh) card names.
 *
 * Used by the ja, tw, cn and jp-pokellector image crawlers, which each held an
 * identical private copy of this before it was hoisted here.
 */
export function normalizeNameCjk(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\s　]/g, "")
    .replace(/[·・.,'’"“”\-—–~〜!?！？:：;；()（）「」『』【】[\]]/g, "")
    .toLowerCase();
}

/**
 * Case/punctuation-insensitive ENGLISH-name compare — apostrophes, hyphens and
 * ♂/♀ vary in printed casing/spacing across sources. Also drops a leading
 * "Basic ": resolvePokemonCardNameEn's energy-card translations say "Basic
 * Grass Energy" where japanesepokemoncards.uk's alt text says "Grass Energy".
 * Both name the same card, so this isn't a guard-loosening — it's normalizing
 * a known, systematic naming-convention difference between two sources.
 *
 * Differs from normalizeNameCjk in two ways that matter: the "basic" strip,
 * and an ASCII-only punctuation class (it never sees CJK punctuation, because
 * both sides of its comparison are already English).
 *
 * Used by the jp-uk image crawler.
 */
export function normalizeNameAsciiEn(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/^basic\s+/i, "")
    .replace(/[\s]/g, "")
    .replace(/['’"“”\-–—.,]/g, "")
    .toLowerCase();
}

/**
 * Collapses to lowercase alphanumeric words separated by single spaces.
 *
 * Unlike the other two this KEEPS word boundaries (it maps punctuation to a
 * space rather than deleting it) and discards non-ASCII entirely, which is
 * what makes it right for matching English SET names off Bulbapedia wikitext
 * and wrong for matching card names. Do not substitute one for the other.
 *
 * Used by the bulbapedia set-logo crawler.
 */
export function normalizeNameLoose(text: string): string {
  return text.toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * The union of the entity tables the crawlers previously carried separately
 * (4 entities in jp-uk, 5 in set-logos-pokellector, 2 inline in
 * set-logos-dextcg). A superset is safe here because every one of these
 * decodes to exactly one character with no context sensitivity, and each
 * source's own output was checked for the entities it had not previously
 * handled before merging (none present).
 *
 * Not a general-purpose HTML entity decoder — it covers the entities these
 * sources actually emit (chiefly "&" in set names like "Sun & Moon" and
 * apostrophes in names like Farfetch'd). Add to it only from observed markup.
 */
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&#x27;": "'",
  "&#39;": "'",
  "&quot;": '"',
  "&lt;": "<",
  "&gt;": ">",
};

export function decodeHtmlEntities(s: string): string {
  return s.replace(/&(?:amp|#x27|#39|quot|lt|gt);/g, (m) => HTML_ENTITIES[m] ?? m);
}
