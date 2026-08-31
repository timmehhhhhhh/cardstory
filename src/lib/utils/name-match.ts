/**
 * Expands a user-typed search query into variants that also match names
 * differing only in whether words are joined by a space or a hyphen (e.g.
 * "Blaziken EX" vs the catalog's "Blaziken-EX", "Ho Oh" vs "Ho-Oh"). Always
 * includes the original query; a Set dedupes so a query with no space or
 * hyphen returns a single-element array (no behavior change for the common
 * case).
 */
export function nameSearchVariants(q: string): string[] {
  const variants = new Set<string>([q]);
  if (q.includes(" ")) variants.add(q.replace(/ /g, "-"));
  if (q.includes("-")) variants.add(q.replace(/-/g, " "));
  return Array.from(variants);
}

/**
 * Lowercases and strips everything but letters/digits, so e.g. "Kai'Sa",
 * "Kai Sa", "Kaisa" and "KAI-SA" all collapse to the same "kaisa", and
 * "Irelia - Fervent" / "Irelia, Fervent" / "Irelia Fervent" all collapse to
 * "ireliafervent". Used to build a punctuation-agnostic match that plain
 * substring `contains` (even with nameSearchVariants' space/hyphen swap)
 * can't express, since it can't guess *where* a stored name's apostrophe or
 * separator falls relative to a query with none. See
 * punctuationInsensitiveIds in lib/catalog/search.ts, which runs this same
 * normalization DB-side (Postgres regexp_replace) so a query normalized
 * here can be compared against a stored name normalized there.
 */
export function normalizeForPunctuationInsensitiveMatch(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Splits a trailing card-number token off a query like "salamence 64/101"
 * or "salamence 64" into `{ namePart: "salamence", numberPart: "64/101" }` —
 * the app-wide "name + number" search convention (case-insensitive, matches
 * either the full "64/101" or just the leading "64"). The trailing
 * whitespace-separated token is treated as a number when it contains at
 * least one digit and there's a non-empty token before it; otherwise the
 * whole query is returned as `namePart` with `numberPart: null`, so a plain
 * name-only or number-only query behaves exactly as before (single-field
 * `contains` matching, unaffected by this split).
 */
export function parseNameNumberQuery(q: string): { namePart: string; numberPart: string | null } {
  const trimmed = q.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace <= 0) return { namePart: trimmed, numberPart: null };
  const head = trimmed.slice(0, lastSpace).trim();
  const tail = trimmed.slice(lastSpace + 1).trim();
  if (head && /\d/.test(tail)) {
    return { namePart: head, numberPart: tail };
  }
  return { namePart: trimmed, numberPart: null };
}

/**
 * Splits a `numberPart` like `"185/181"` (a card's local number over its
 * set's total printed card count, as collectors write it — see
 * parseNameNumberQuery) into its two halves. Returns null for a plain
 * number with no slash (e.g. `"185"`), so existing "name + number" callers
 * that don't care about set size are unaffected. Used by
 * lib/catalog/search.ts's tcgNameNumberClause/tcgWhereFor to also constrain
 * the match to CatalogItem rows whose Set.cardCount equals the total, since
 * `CatalogItem.number` itself only ever stores the bare local number (e.g.
 * "185", not "185/181") — the printed total lives on the Set, not the card.
 */
export function parseNumberSlashTotal(
  numberPart: string | null
): { cardNumber: string; setTotal: number } | null {
  if (!numberPart) return null;
  const match = /^(\d+)\/(\d+)$/.exec(numberPart.trim());
  if (!match) return null;
  return { cardNumber: match[1], setTotal: Number(match[2]) };
}

/**
 * Client-side "does this card match this query" test, for the app's local
 * (non-DB-backed) search filters — e.g. src/app/binder/_components/
 * card-picker-sheet.tsx and PC's own Card Name filter (see
 * src/app/pc/_components/smart-filters.tsx). Matches a plain query against
 * name/nameEn/number individually (same as a single-field `contains`), and
 * additionally accepts a combined "name + number" query per
 * parseNameNumberQuery above (e.g. "salamence 64/101" or "salamence 64").
 * Case-insensitive throughout. An empty query matches everything.
 */
export function matchesNameNumberQuery(
  query: string,
  card: { name: string; nameEn?: string | null; number?: string | null }
): boolean {
  const q = query.trim();
  if (!q) return true;
  const lowerQ = q.toLowerCase();
  const includes = (s: string | null | undefined, needle: string) =>
    !!s && s.toLowerCase().includes(needle.toLowerCase());

  if (includes(card.name, lowerQ) || includes(card.nameEn, lowerQ) || includes(card.number, lowerQ)) {
    return true;
  }

  const { namePart, numberPart } = parseNameNumberQuery(q);
  if (numberPart) {
    const nameOk = includes(card.name, namePart) || includes(card.nameEn, namePart);
    const numberOk = includes(card.number, numberPart);
    if (nameOk && numberOk) return true;
  }
  return false;
}
