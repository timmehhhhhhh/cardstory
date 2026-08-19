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
