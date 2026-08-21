/**
 * "リザードンex (Charizard ex)" — the inline single-string form of a
 * card/set name plus its English translation, for contexts that only take
 * one string (dialog titles, aria-labels, breadcrumbs). Returns `name`
 * unchanged when there's no translation — see CatalogItem.nameEn /
 * Set.nameEn's "not yet identified" convention.
 *
 * For anywhere with room for a second line, prefer rendering `nameEn`
 * directly as a stacked subtitle instead (see card-tile.tsx / set-tile.tsx)
 * — this helper is for the one-line cases only.
 */
export function withEnglishName(name: string, nameEn: string | null | undefined): string {
  return nameEn ? `${name} (${nameEn})` : name;
}
