/**
 * Riftbound's printed card-type line combines a base `type` (Unit, Spell,
 * Gear, Rune, Battlefield, Legend) with an optional `supertype` (Champion,
 * Signature, Basic, Token) — e.g. a champion's Unit card is printed as
 * "Champion Unit", not just "Unit". riftcodex.com's API exposes these as two
 * separate `classification` fields (see mapper.ts); this combines them back
 * into the single label the game itself prints on the card, which is what
 * Explore filters/sorts by (CatalogItem.cardType).
 *
 * Deliberately not an enum/hardcoded list of every possible combo — new sets
 * can introduce new supertypes, and Explore reads the real distinct values
 * out of the DB after seeding (see lib/catalog/search.ts#getDistinctCardTypes)
 * rather than trusting a list here to stay exhaustive.
 */
export function cardTypeLabel(type: string, supertype: string | null | undefined): string {
  return supertype ? `${supertype} ${type}` : type;
}
