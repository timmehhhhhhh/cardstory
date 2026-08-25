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
