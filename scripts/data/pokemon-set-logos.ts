/**
 * Set-logo (wordmark) URLs for non-English Pokémon sets, keyed by Set.code
 * (e.g. "zh-cn:CSV5C"). tcgdex.net — the provider for JA/ZH-CN/ZH-TW/KO sets
 * — only ever returns a `logo` for the "en" locale (confirmed against the
 * live API; see mapTcgdexSet's doc comment in lib/games/pokemon/mapper.ts),
 * so every non-English Set.logoUrl is otherwise null and falls back to the
 * reconstructed symbol icon in the UI (see set-tile.tsx's SetIcon).
 *
 * Source: https://www.card-corner.de/chinese-pokemon-card-list — a German
 * Pokémon retailer, NOT the official publisher. Their page lists Simplified
 * Chinese (zh-cn) sets with real set-logo .webp images hosted on their own
 * CDN, several labeled with the set's own internal code (e.g. "Bonus Round
 * (CSV4C)"), which is what each entry below was matched against — cross
 * -checked here against the live Set.name (native Chinese title) for every
 * code before being added. URLs are hotlinked directly (same pattern as
 * tcgdex-hosted images elsewhere in this app), not rehosted, so they depend
 * on card-corner.de keeping these paths stable; SetIcon already degrades
 * gracefully to the symbol icon on a 404.
 *
 * Only covers the zh-cn sets card-corner's page confidently matches by
 * explicit code or an unambiguous name — deliberately excludes sets whose
 * card-corner code/name didn't corroborate against a real Set row (e.g.
 * "Gem Pack 6"/"Brilliant Fantasy", which have no matching zh-cn Set at all
 * yet; "Promo Pack (CSVL1)"/"Collect 151", whose stated code doesn't match
 * any current zh-cn Set.code; and card-corner's three Sword & Shield-era
 * logos, whose sets couldn't be confidently identified from name alone).
 * Add more entries here as further sets are confidently matched — consumed
 * by both mapTcgdexSet (new sets going forward, see mapper.ts) and
 * scripts/backfill-set-logo-url.ts (one-time backfill of existing rows).
 */
export const POKEMON_SET_LOGOS: Record<string, string> = {
  "zh-cn:CSV1C":
    "https://www.card-corner.de/media/image/opc/xl/1%20Pokemon/Gen%209%20-%20Scarlet%20and%20Violet/3%20CHN/1%20Eternal%20Beginnings/eternal_awakening_logo.webp",
  "zh-cn:CSV2C":
    "https://www.card-corner.de/media/image/opc/xl/1%20Pokemon/Gen%209%20-%20Scarlet%20and%20Violet/3%20CHN/4%20Miracle%20Journey/miracle_journey_logo.webp",
  "zh-cn:CSV3C":
    "https://www.card-corner.de/media/image/opc/xl/1%20Pokemon/Gen%209%20-%20Scarlet%20and%20Violet/3%20CHN/6%20Fearless%20Terastal/Grafiken/asfdsf.webp",
  "zh-cn:CSV4C":
    "https://www.card-corner.de/media/image/opc/xl/1%20Pokemon/Gen%209%20-%20Scarlet%20and%20Violet/3%20CHN/8%20Bonus%20Round%20CSV4C/Grafiken/bonus_round_logo.webp",
  "zh-cn:CSV5C":
    "https://www.card-corner.de/media/image/opc/xl/1%20Pokemon/Gen%208%20-%20Sword%20and%20Shield/3%20CHN/Black%20Crystal%20Blaze/Grafiken/black_crystal_blaze_logo.webp",
  "zh-cn:CSV7C":
    "https://www.card-corner.de/media/image/opc/xl/1%20Pokemon/Gen%209%20-%20Scarlet%20and%20Violet/3%20CHN/10%20Blade%20Awakening/Grafiken/blade_awakening_logo.webp",
  "zh-cn:CSV9C":
    "https://www.card-corner.de/media/image/opc/xl/1%20Pokemon/Gen%209%20-%20Scarlet%20and%20Violet/3%20CHN/13%20Stellar%20Crystal/Grafiken/stellar_crystal_logo.webp",
  "zh-cn:CSV9.5C":
    "https://www.card-corner.de/media/image/opc/xl/1%20Pokemon/Gen%209%20-%20Scarlet%20and%20Violet/3%20CHN/14%20Terastal%20Gathering/Grafiken/terastal_gathering_logo1.webp",
  "zh-cn:CBB2C":
    "https://www.card-corner.de/media/image/opc/xl/1%20Pokemon/Gen%209%20-%20Scarlet%20and%20Violet/3%20CHN/5%20Gem%20Pack%202/Grafiken/gem_2.webp",
  "zh-cn:CBB3C":
    "https://www.card-corner.de/media/image/opc/xl/1%20Pokemon/Gen%209%20-%20Scarlet%20and%20Violet/3%20CHN/9%20Gem%20Pack%203/Grafiken/gem_3.webp",
  "zh-cn:CBB4C":
    "https://www.card-corner.de/media/image/opc/xl/1%20Pokemon/Gen%209%20-%20Scarlet%20and%20Violet/3%20CHN/11%20Gem%20Pack%204/Grafiken/gem_pack_4_logo.webp",
  "zh-cn:CBB5C":
    "https://www.card-corner.de/media/image/opc/xl/1%20Pokemon/Gen%209%20-%20Scarlet%20and%20Violet/3%20CHN/12%20Gem%20Pack%205/Grafiken/gem_pack_5_logo.webp",
};
