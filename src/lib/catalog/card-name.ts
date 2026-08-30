/**
 * "Charizard ex (リザードンex)" — the inline single-string form of a
 * card/set name plus its native-language original, for contexts that only
 * take one string (dialog titles, aria-labels, breadcrumbs). Leads with
 * `nameEn` — most collectors using this app read English, not the card's
 * printed language — falling back to the bare `name` unchanged when there's
 * no translation yet (see CatalogItem.nameEn / Set.nameEn's "not yet
 * identified" convention).
 *
 * For anywhere with room for a second line, prefer `primaryName`/
 * `secondaryName` below instead (see card-tile.tsx / set-tile.tsx) — this
 * helper is for the one-line cases only.
 */
export function withEnglishName(name: string, nameEn: string | null | undefined): string {
  return nameEn ? `${nameEn} (${name})` : name;
}

/**
 * The name to render as the bold/primary line for a card or set: the
 * English translation when one is known, otherwise the printed name as-is.
 * Pair with `secondaryName` for the small subtitle underneath — together
 * these replace the old "native name always primary" convention so a
 * collector who can't read the card's printed language (e.g. Japanese)
 * still sees an English name first wherever this card appears.
 */
export function primaryName(name: string, nameEn: string | null | undefined): string {
  return nameEn ?? name;
}

/**
 * The subtitle line to pair with `primaryName` — the printed (native) name,
 * but only when it differs from what's already shown as primary (i.e. only
 * when nameEn exists). Null means "nothing to show", so call sites can
 * write `{secondary && <p>{secondary}</p>}` directly.
 */
export function secondaryName(name: string, nameEn: string | null | undefined): string | null {
  return nameEn ? name : null;
}
