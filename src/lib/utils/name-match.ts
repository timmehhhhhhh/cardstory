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
 * Sibling to parseNumberSlashTotal, for promo sets printed as "173/SV-P"
 * instead of "185/181" — the denominator on a promo card is the set's own
 * code (as collectors write it, e.g. "SV-P", "SWSH", "BW-P"), not a numeric
 * printed total, so `CatalogItem.number`'s counterpart to check against is
 * `Set.code` rather than `Set.cardCount`. Requires the denominator to start
 * with a letter (never all-digit) so a genuine numeric-total query like
 * "185/181" keeps resolving via parseNumberSlashTotal instead of this
 * function — the two are mutually exclusive on any real input. Returns null
 * for anything else, including a bare number with no slash.
 */
export function parseNumberSlashCode(
  numberPart: string | null
): { cardNumber: string; setCode: string } | null {
  if (!numberPart) return null;
  const match = /^(\d+)\/([A-Za-z][A-Za-z0-9-]*)$/.exec(numberPart.trim());
  if (!match) return null;
  return { cardNumber: match[1], setCode: match[2] };
}

/**
 * Small stopwords dropped when deriving a set's initials — see
 * deriveSetInitials. Kept minimal and generic (not tuned to any specific
 * set) so the derivation stays a general rule rather than a lookup table.
 */
const SET_INITIALS_STOPWORDS = new Set(["of", "the", "and"]);

/**
 * Derives a fan/community-style short code from a set's name by taking the
 * first letter of each significant word, e.g. "Mega Evolution Promos" ->
 * "MEP", "Scarlet & Violet" -> "SV". There is no stored "short code" field
 * for English sets (Set.code is the raw provider id, e.g. "me2", not a fan
 * abbreviation — see Set.code's column comment in prisma/schema.prisma), so
 * this recomputes the same initials a collector would read off the set name
 * itself, rather than depending on a curated table that would need
 * maintaining per set. Used by parseCodeNumberQuery-derived searches (see
 * matchingSetIdsForAlphaCode in lib/catalog/search.ts and the client-side
 * matchesNameNumberQuery below) to let a query like "MEP 014" resolve to
 * whichever set's name happens to initialize to "MEP".
 */
export function deriveSetInitials(name: string): string {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .filter((word) => !SET_INITIALS_STOPWORDS.has(word.toLowerCase()))
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * Compares two card-number-like strings ignoring leading zeros, e.g.
 * numbersMatch("014", "14") and numbersMatch("14", "014") are both true —
 * collectors write a set's short-form number both zero-padded ("MEP 014",
 * matching how it's printed on the card) and bare ("MEP 14"). Falls back to
 * a case-insensitive substring `contains` when either side isn't purely
 * numeric (e.g. a promo number like "SWSH001" or a partial digit query),
 * matching the `contains` semantics used everywhere else card numbers are
 * compared (see tcgNameNumberClause/parseNameNumberQuery).
 */
export function numbersMatch(a: string, b: string): boolean {
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) return parseInt(a, 10) === parseInt(b, 10);
  return a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());
}

/**
 * Parses a short-form "set code + card number" query into its two parts,
 * accepting every spacing/casing collectors actually type: "MEP 014",
 * "MEP014", "MEP14", "MEP 14", plus an optional "EN" language marker before
 * the number ("MEP EN 014", "MEPEN014", "MEP EN 14", "MEPEN14"). The digits
 * are returned as typed (leading zeros intact) — compare them with
 * numbersMatch, not `===`/`contains`, so "014" and "14" are treated as the
 * same card number. Returns null for anything that isn't
 * letters-then-optional-EN-then-digits (e.g. a plain name or a bare number),
 * so this never interferes with the existing name/number search paths.
 */
export function parseCodeNumberQuery(q: string): { alpha: string; cardNumber: string } | null {
  const compact = q.trim().replace(/\s+/g, "");
  const match = /^([A-Za-z]+?)(\d+)$/.exec(compact);
  if (!match) return null;
  let alpha = match[1].toUpperCase();
  const cardNumber = match[2];
  // Strip a trailing "EN" language marker (e.g. "MEPEN" -> "MEP") — only
  // when something remains, so a genuine 2-letter code ending in "EN"
  // in isolation (rare) still round-trips as itself rather than emptying out.
  if (alpha.length > 2 && alpha.endsWith("EN")) alpha = alpha.slice(0, -2);
  if (!alpha) return null;
  return { alpha, cardNumber };
}

/**
 * Parses a bare National Pokédex-number query, either paired with a card
 * number ("937 014", "937 14", "0937 014", "0937 14" -> dexNumber 937 +
 * cardNumber) or paired with a set's derived initials with no card number
 * ("MEP 937" -> alpha "MEP" + dexNumber 937, i.e. "which card in this set
 * has this dex number"). Both tokens' leading zeros are insignificant — see
 * numbersMatch/parseInt. Returns null when the query isn't two
 * whitespace-separated tokens matching one of these two shapes.
 */
export function parseDexNumberQuery(
  q: string
): { dexNumber: number; cardNumber: string } | { alpha: string; dexNumber: number } | null {
  const parts = q.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const [first, second] = parts;
  if (/^\d+$/.test(first) && /^\d+$/.test(second)) {
    return { dexNumber: parseInt(first, 10), cardNumber: second };
  }
  if (/^[A-Za-z]+$/.test(first) && /^\d+$/.test(second)) {
    return { alpha: first.toUpperCase(), dexNumber: parseInt(second, 10) };
  }
  return null;
}

/**
 * Splits a query into a leading "name" phrase and a trailing single word,
 * for queries like "Ceruledge Promo" where the trailing word identifies the
 * set (e.g. matches "Mega Evolution Promos") rather than a card number —
 * the non-numeric sibling of parseNameNumberQuery, which only splits off a
 * trailing *numeric* token. Returns null when the query has no space (a
 * single word can't be split into "name" + "set word").
 */
export function splitTrailingWord(q: string): { head: string; tail: string } | null {
  const trimmed = q.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace <= 0) return null;
  const head = trimmed.slice(0, lastSpace).trim();
  const tail = trimmed.slice(lastSpace + 1).trim();
  if (!head || !tail) return null;
  return { head, tail };
}

/**
 * Client-side "does this card match this query" test, for the app's local
 * (non-DB-backed) search filters — e.g. src/app/binder/_components/
 * card-picker-sheet.tsx and the PC List/Gallery's Card Name filter (see
 * src/app/pc/_components/pc-client.tsx). Matches a plain query against
 * name/nameEn/number individually (same as a single-field `contains`), a
 * combined "name + number" query per parseNameNumberQuery above (e.g.
 * "salamence 64/101" or "salamence 64"), and — when the optional set fields
 * are supplied — the same short-form "set code + number" / "Pokédex number +
 * number" / "name + set word" shapes the DB-backed search in
 * lib/catalog/search.ts resolves (e.g. "MEP 014", "937 14", "Ceruledge
 * Promo"), via the same deriveSetInitials/parseCodeNumberQuery/
 * parseDexNumberQuery/numbersMatch/splitTrailingWord helpers, so the two
 * search surfaces apply identical rules instead of drifting apart.
 * Case-insensitive throughout. An empty query matches everything.
 */
export function matchesNameNumberQuery(
  query: string,
  card: {
    name: string;
    nameEn?: string | null;
    number?: string | null;
    setName?: string | null;
    setNameEn?: string | null;
    setCode?: string | null;
    nationalPokedexNumbers?: number[] | null;
  }
): boolean {
  const q = query.trim();
  if (!q) return true;
  const lowerQ = q.toLowerCase();
  const includes = (s: string | null | undefined, needle: string) =>
    !!s && s.toLowerCase().includes(needle.toLowerCase());

  if (includes(card.name, lowerQ) || includes(card.nameEn, lowerQ) || includes(card.number, lowerQ)) {
    return true;
  }

  // Punctuation-agnostic fallback, e.g. "Pikachu EX"/"pikachu ex" still
  // finding "Pikachu-EX" — the client-side counterpart to
  // punctuationInsensitiveIds in lib/catalog/search.ts (that one runs the
  // same normalization DB-side; this one has the actual strings in hand, so
  // no DB round-trip is needed).
  const normalizedQ = normalizeForPunctuationInsensitiveMatch(q);
  if (
    normalizedQ &&
    (normalizeForPunctuationInsensitiveMatch(card.name).includes(normalizedQ) ||
      (!!card.nameEn && normalizeForPunctuationInsensitiveMatch(card.nameEn).includes(normalizedQ)))
  ) {
    return true;
  }

  const { namePart, numberPart } = parseNameNumberQuery(q);
  if (numberPart) {
    const normalizedNamePart = normalizeForPunctuationInsensitiveMatch(namePart);
    const nameOk =
      includes(card.name, namePart) ||
      includes(card.nameEn, namePart) ||
      (!!normalizedNamePart &&
        (normalizeForPunctuationInsensitiveMatch(card.name).includes(normalizedNamePart) ||
          !!card.nameEn && normalizeForPunctuationInsensitiveMatch(card.nameEn).includes(normalizedNamePart)));
    const numberOk = includes(card.number, numberPart);
    if (nameOk && numberOk) return true;
  }

  const codeMatchesAlpha = (alpha: string): boolean =>
    includes(card.setCode, alpha) ||
    (!!card.setName && deriveSetInitials(card.setName) === alpha) ||
    (!!card.setNameEn && deriveSetInitials(card.setNameEn) === alpha);

  const codeNumber = parseCodeNumberQuery(q);
  if (codeNumber && card.number && codeMatchesAlpha(codeNumber.alpha) && numbersMatch(card.number, codeNumber.cardNumber)) {
    return true;
  }

  const dexNumber = parseDexNumberQuery(q);
  if (dexNumber) {
    const dexOk = !!card.nationalPokedexNumbers?.includes(dexNumber.dexNumber);
    if ("cardNumber" in dexNumber) {
      if (dexOk && card.number && numbersMatch(card.number, dexNumber.cardNumber)) return true;
    } else if (dexOk && codeMatchesAlpha(dexNumber.alpha)) {
      return true;
    }
  }

  const setWord = splitTrailingWord(q);
  if (setWord) {
    const nameOk = includes(card.name, setWord.head) || includes(card.nameEn, setWord.head);
    const setOk = includes(card.setName, setWord.tail) || includes(card.setNameEn, setWord.tail);
    if (nameOk && setOk) return true;
  }

  return false;
}
