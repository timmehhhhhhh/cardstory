/**
 * Small MediaWiki API helpers for scripts/crawl-pokemon-set-logos-bulbapedia.ts.
 * Bulbapedia (bulbapedia.bulbagarden.net) runs on MediaWiki, so instead of
 * scraping rendered HTML like every other crawler in this repo, this reads
 * `action=parse&prop=wikitext` — the same source markup an editor types —
 * and picks the `{{TCGExpansionInfobox ...}}` template's parameters out of
 * it. This is more reliable than DOM scraping (no CSS-selector drift risk)
 * and is what MediaWiki's API exists for; not a workaround.
 *
 * Kept deliberately minimal: a depth-aware template/param splitter, not a
 * full wikitext parser. Confirmed sufficient against live examples of all
 * three page shapes this crawler needs (Crown Zenith (TCG) — dual EN/JA,
 * Abyss Eye (TCG) — JA-only, Sword & Shield (ATCG) — multi-locale
 * Traditional Chinese/Thai/Indonesian, Another World (KTCG) — Korean).
 */

export const MW_API = "https://bulbapedia.bulbagarden.net/w/api.php";

export function mwApiUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams({ format: "json", ...params });
  return `${MW_API}?${qs.toString()}`;
}

export interface MwCategoryMember {
  pageid: number;
  ns: number;
  title: string;
}

/**
 * Finds the `{{<templateName> ... }}` block in wikitext, brace-depth-aware
 * so a nested template inside a param value (e.g. Sword & Shield (ATCG)'s
 * `|deck1={{ATCG|...}}`) doesn't truncate the scan early. Returns the raw
 * text between the outer `{{` and its matching `}}`, template name included,
 * or null if not found.
 */
export function extractTemplateBlock(wikitext: string, templateName: string): string | null {
  const start = wikitext.indexOf(`{{${templateName}`);
  if (start === -1) return null;

  let depth = 0;
  let i = start;
  while (i < wikitext.length) {
    if (wikitext.startsWith("{{", i)) {
      depth += 1;
      i += 2;
      continue;
    }
    if (wikitext.startsWith("}}", i)) {
      depth -= 1;
      i += 2;
      if (depth === 0) return wikitext.slice(start, i);
      continue;
    }
    i += 1;
  }
  return null; // unterminated — malformed page, treat as absent
}

/**
 * Splits a `{{Template|k1=v1|k2=v2}}` block into its params, depth-aware
 * across both `{{...}}` and `[[...]]` so a `|` inside a nested template call
 * or a piped wikilink (`[[File:X|thumb|caption]]`) never gets mistaken for a
 * param boundary. Values are trimmed but not further decoded.
 */
export function parseTemplateParams(block: string): Record<string, string> {
  // Strip the leading `{{TemplateName` and trailing `}}`.
  const inner = block.replace(/^\{\{[^|}]+/, "").replace(/\}\}$/, "");

  const params: Record<string, string> = {};
  let depth = 0;
  let current = "";
  const parts: string[] = [];
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2);
    if (two === "{{" || two === "[[") {
      depth += 1;
      current += two;
      i += 1;
      continue;
    }
    if (two === "}}" || two === "]]") {
      depth = Math.max(0, depth - 1);
      current += two;
      i += 1;
      continue;
    }
    if (inner[i] === "|" && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += inner[i];
  }
  parts.push(current);

  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue; // positional param (unused by this template)
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) params[key] = value;
  }
  return params;
}

/**
 * Picks up `[[File:Name.png|thumb|180px|right|<Language> logo]]` embeds that
 * sit outside the infobox — how ATCG pages carry the non-primary locales'
 * logos (e.g. Sword & Shield (ATCG) has Thai/Indonesian logos this way,
 * while the primary Traditional Chinese one is `setlogo` in the infobox).
 * Keyed by the caption's leading word (e.g. "Thai", "Indonesian") lowercased.
 */
export function extractCaptionedLogoFiles(wikitext: string): Map<string, string> {
  const out = new Map<string, string>();
  const pattern = /\[\[File:([^|\]]+\.(?:png|jpg|jpeg|gif))\|[^\]]*?\b([A-Za-z]+) logo\]\]/gi;
  for (const m of wikitext.matchAll(pattern)) {
    const [, file, label] = m;
    out.set(label.toLowerCase(), file);
  }
  return out;
}

/** Strips wikitext bold/italic markup (`'''x'''`, `''x''`) from a plain value. */
export function stripWikiMarkup(text: string): string {
  return text.replace(/'''/g, "").replace(/''/g, "").trim();
}

/**
 * Splits a `setname` field on its first `<br>`/`<br/>` and returns the
 * second segment (the native-script name), with any wrapping `<small>` tags
 * — sometimes doubled, e.g. `<small><small>眾星雲集組合篇</small></small>` —
 * stripped. Native scripts have no case-folding ambiguity, so this is meant
 * to be matched against `Set.name` by exact equality, a stronger signal than
 * an English-gloss comparison across two independently-written translations.
 * Returns null when there's no second segment (single-locale pages).
 */
export function extractNativeNameFromSetname(setname: string): string | null {
  const parts = setname.split(/<br ?\/?>/i);
  if (parts.length < 2) return null;
  const native = parts[1].replace(/<\/?small>/gi, "").trim();
  return native || null;
}

/**
 * Parses a `release` field that bundles multiple locales on one line, e.g.
 * `'''Traditional Chinese:''' June 19, 2020<br>'''Thai:''' September 8, 2020`
 * (Sword & Shield (ATCG)'s shape) into { "traditional chinese": "June 19,
 * 2020", "thai": "September 8, 2020" }, keyed lowercase. Falls back to a
 * single `{ "": <whole value> }` entry when there's no bolded-locale
 * structure (KTCG pages, and single-locale ATCG releases).
 */
export function parseMultiLocaleField(value: string): Map<string, string> {
  const out = new Map<string, string>();
  const pattern = /'''([^:']+):'''\s*([^<]+)/g;
  let matched = false;
  for (const m of value.matchAll(pattern)) {
    matched = true;
    out.set(m[1].trim().toLowerCase(), m[2].trim());
  }
  if (!matched) out.set("", stripWikiMarkup(value));
  return out;
}
