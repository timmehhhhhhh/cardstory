/**
 * Hand-curated pieces of the non-English Pokémon card-name resolver — the
 * card-level counterpart to scripts/data/pokemon-set-translations.ts. The
 * bulk of the work is done from the generated species table
 * (scripts/data/pokemon-species-names.ts); everything here covers what a
 * species list structurally cannot: Trainer/Item/Stadium/Energy cards,
 * regional-form adjectives, and the trainer-owned "X's Pokémon" pattern.
 *
 * Provenance, same disclosure spirit as pokemon-set-translations.ts: these
 * are Claude-authored translations cross-checked against the English rows
 * already in this catalog (e.g. "Ultra Ball", "Boss's Orders", "Alolan
 * Exeggutor ex" are all real English printings in catalog_items). Where a
 * Japanese/Chinese/Korean card has a real English counterpart the entry is
 * that counterpart's printed name; where a card is region-exclusive it is a
 * literal translation of the native title, not a claim that an English
 * product exists. Anything uncertain is simply left out — the resolver
 * returns undefined and the UI shows no English subtitle, which is the
 * "not yet identified" convention CatalogItem.nameEn already documents.
 *
 * Consumed by lib/games/pokemon/card-name-en.ts, which is called from
 * mapTcgdexCardVariants (new cards) and scripts/backfill-catalog-name-en.ts
 * (rows seeded before that wiring existed). That backfill also writes
 * pokemon-card-translations.review.json — the frequency-ranked worklist of
 * names still unresolved, which is how POKEMON_CARD_TRANSLATIONS grows.
 */

/**
 * Whole-name overrides, keyed "<CatalogItem.language>:<CatalogItem.name>".
 * Checked before every rule, so it doubles as the escape hatch for any
 * name the rules get wrong.
 */
export const POKEMON_CARD_TRANSLATIONS: Record<string, string> = {
  // --- Basic Energy ------------------------------------------------------
  "JP:基本草エネルギー": "Basic Grass Energy",
  "JP:基本炎エネルギー": "Basic Fire Energy",
  "JP:基本水エネルギー": "Basic Water Energy",
  "JP:基本雷エネルギー": "Basic Lightning Energy",
  "JP:基本超エネルギー": "Basic Psychic Energy",
  "JP:基本闘エネルギー": "Basic Fighting Energy",
  "JP:基本悪エネルギー": "Basic Darkness Energy",
  "JP:基本鋼エネルギー": "Basic Metal Energy",
  "JP:基本フェアリーエネルギー": "Basic Fairy Energy",
  "JP:基本ドラゴンエネルギー": "Basic Dragon Energy",
  "JP:基本無色エネルギー": "Basic Colorless Energy",
  "CN:基本草能量": "Basic Grass Energy",
  "CN:基本火能量": "Basic Fire Energy",
  "CN:基本水能量": "Basic Water Energy",
  "CN:基本雷能量": "Basic Lightning Energy",
  "CN:基本超能量": "Basic Psychic Energy",
  "CN:基本斗能量": "Basic Fighting Energy",
  "CN:基本恶能量": "Basic Darkness Energy",
  "CN:基本金属能量": "Basic Metal Energy",
  "CN:基本妖精能量": "Basic Fairy Energy",
  "TW:基本草能量": "Basic Grass Energy",
  "TW:基本火能量": "Basic Fire Energy",
  "TW:基本水能量": "Basic Water Energy",
  "TW:基本雷能量": "Basic Lightning Energy",
  "TW:基本超能量": "Basic Psychic Energy",
  "TW:基本鬥能量": "Basic Fighting Energy",
  "TW:基本惡能量": "Basic Darkness Energy",
  "TW:基本鋼能量": "Basic Metal Energy",
  "TW:基本金屬能量": "Basic Metal Energy",
  "TW:基本妖精能量": "Basic Fairy Energy",
};

/**
 * Regional-form / Mega adjectives that prefix a species name, keyed
 * "<language>:<prefix>". The English side is a whole word and is joined to
 * the species with a space, matching the English printings already in the
 * catalog ("Alolan Exeggutor ex", "Mega Absol ex").
 */
export const POKEMON_FORM_PREFIXES: Record<string, string> = {
  "JP:アローラ": "Alolan",
  "JP:ガラル": "Galarian",
  "JP:ヒスイ": "Hisuian",
  "JP:パルデア": "Paldean",
  "JP:メガ": "Mega",
  "JP:ゲンシ": "Primal",
  "JP:原始": "Primal",
  "CN:阿罗拉": "Alolan",
  "CN:伽勒尔": "Galarian",
  "CN:洗翠": "Hisuian",
  "CN:帕底亚": "Paldean",
  "CN:超级": "Mega",
  "CN:原始": "Primal",
  "TW:阿羅拉": "Alolan",
  "TW:伽勒爾": "Galarian",
  "TW:洗翠": "Hisuian",
  "TW:帕底亞": "Paldean",
  "TW:超級": "Mega",
  "TW:原始": "Primal",
  "KR:알로라": "Alolan",
  "KR:가라르": "Galarian",
  "KR:히스이": "Hisuian",
  "KR:팔데아": "Paldean",
  "KR:메가": "Mega",
  "KR:원시": "Primal",
};

/**
 * Owners of trainer-owned Pokémon ("ペパーのマフィティフ" -> "Pepper's
 * Mabosstiff"), keyed "<language>:<owner>". Deliberately a closed list: the
 * resolver refuses to translate a possessive whose owner isn't here rather
 * than falling back to the bare species, because "マリィのズルズキン" ->
 * "Scrafty" would be a wrong name, not an incomplete one.
 */
export const POKEMON_TRAINER_POSSESSIVES: Record<string, string> = {};
