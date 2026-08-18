/**
 * Builds the `/card/[game]/[cardId]` route href for a catalog row. The
 * `[cardId]` segment must round-trip back into the exact CatalogItem.id via
 * `${game}:${decodeURIComponent(cardId)}` (see getTcgCard in
 * app/card/[game]/[cardId]/page.tsx). That used to just be the externalId,
 * which was fine when one externalId always meant exactly one CatalogItem
 * row — but Pokémon finish variants (see CatalogItem.variantKey) now let one
 * externalId back several rows sharing the same "<gameId>:<externalId>"
 * prefix but differing after it (the primary/legacy finish keeps the bare
 * id, additional finishes get an ":<variantKey>" suffix — see
 * lib/games/pokemon/mapper.ts). Linking by externalId alone would collapse
 * every variant's shortcut onto the same (primary) detail page, silently
 * defeating the whole point of listing them separately. Slicing the full
 * catalogItemId after its "<gameId>:" prefix instead gives each row its own
 * correct URL while staying byte-identical to today's links for every
 * single-variant row (every non-Pokémon game, and Pokémon cards with only
 * one priced finish).
 *
 * Sports rows have no such prefix (SportsCardItem.id has no gameId baked
 * in, and there's no variant/finish concept for them), so they link by their
 * raw id unchanged.
 */
export function cardDetailHref(gameId: string, catalogItemId: string, isSports: boolean): string {
  const slug = isSports ? catalogItemId : catalogItemId.slice(gameId.length + 1);
  return `/card/${gameId}/${encodeURIComponent(slug)}`;
}
