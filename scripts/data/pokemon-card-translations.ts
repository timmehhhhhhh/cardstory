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

  // --- Bracket-style elemental energy, TW ---------------------------------
  "TW:基本【超】能量": "Basic Psychic Energy",
  "TW:基本【雷】能量": "Basic Lightning Energy",
  "TW:基本【火】能量": "Basic Fire Energy",
  "TW:基本【鬥】能量": "Basic Fighting Energy",
  "TW:基本【水】能量": "Basic Water Energy",
  "TW:基本【草】能量": "Basic Grass Energy",
  "TW:基本【惡】能量": "Basic Darkness Energy",
  "TW:基本【鋼】能量": "Basic Metal Energy",

  // --- Common Trainer/Item cards, JP --------------------------------------
  // Verified against this catalog's own English (language="EN") rows and/or
  // well-documented official English Pokémon TCG print names.
  "JP:ポケモンいれかえ": "Switch",
  "JP:ハイパーボール": "Ultra Ball",
  "JP:ふしぎなアメ": "Rare Candy",
  "JP:ネストボール": "Nest Ball",
  "JP:ネットボール": "Net Ball",
  "JP:ポケギア3.0": "Poké Gear 3.0",
  "JP:ボスの指令": "Boss's Orders",
  "JP:あなぬけのヒモ": "Escape Rope",
  "JP:こだわりハチマキ": "Choice Band",
  "JP:ジャッジマン": "Judge",
  "JP:改造ハンマー": "Tool Scrapper",
  "JP:ツールスクラッパー": "Tool Scrapper",
  "JP:ダブル無色エネルギー": "Double Colorless Energy",
  "JP:ポケモンキャッチャー": "Pokémon Catcher",
  "JP:アクアパッチ": "Aqua Patch",
  "JP:エネルギー回収": "Energy Retrieval",
  "JP:エネルギーつけかえ": "Energy Switch",
  "JP:なぞの化石": "Mysterious Fossil",
  "JP:フィールドブロアー": "Field Blower",
  "JP:ふうせん": "Air Balloon",
  "JP:ポケモン通信": "Pokémon Communication",
  "JP:まんたんのくすり": "Max Potion",
  "JP:溶接工": "Welder",
  "JP:クラッシュハンマー": "Crushing Hammer",
  "JP:すごいつりざお": "Super Rod",
  "JP:リセットスタンプ": "Reset Stamp",
  "JP:ロストスイーパー": "Lost Sweeper",
  "JP:レインボーエネルギー": "Rainbow Energy",
  "JP:ロトム図鑑": "Rotom Phone",
  "JP:ワザマシン エヴォリューション": "TM Evolution",
  "JP:エスケープボード": "Escape Board",
  "JP:いちげきエネルギー": "Single Strike Energy",
  "JP:れんげきエネルギー": "Rapid Strike Energy",
  "JP:ビーストリング": "Beast Ring",
  "JP:ジェットエネルギー": "Jet Energy",
  "JP:ダブルターボエネルギー": "Double Turbo Energy",
  "JP:クリスタルエネルギー": "Crystal Energy",
  "JP:オーロラエネルギー": "Aurora Energy",
  "JP:ルミナスエネルギー": "Luminous Energy",
  "JP:頂への雪道": "Path to the Peak",

  // Character/Supporter names (JP).
  "JP:リーリエ": "Lillie",
  "JP:キバナ": "Kabu",
  "JP:ナンジャモ": "Iono",
  "JP:ネモ": "Nemona",
  "JP:ルザミーネ": "Lusamine",
  "JP:アセロラ": "Acerola",
  "JP:グズマ": "Guzma",
  "JP:グルーシャ": "Grusha",
  "JP:シロナ": "Cynthia",
  "JP:ツツジ": "Klara",

  // --- Common Trainer/Item cards, TW (Traditional Chinese) ----------------
  // Same-card counterparts of the JP entries above, in TW's own wording.
  "TW:寶可夢交替": "Switch",
  "TW:高級球": "Ultra Ball",
  "TW:神奇糖果": "Rare Candy",
  "TW:巢穴球": "Nest Ball",
  "TW:寶可夢捕捉器": "Pokémon Catcher",
  "TW:裁判": "Judge",
  "TW:超級球": "Great Ball",
  "TW:等級球": "Level Ball",
  "TW:先機球": "Quick Ball",
  "TW:精靈球": "Poké Ball",
  "TW:傷藥": "Potion",
  "TW:老大的指令": "Boss's Orders",
  "TW:能量回收": "Energy Retrieval",
  "TW:進化薰香": "Evolution Incense",
  "TW:講究腰帶": "Choice Band",
  "TW:氣球": "Air Balloon",
  "TW:道具拆除器": "Tool Scrapper",
  "TW:寶可裝置3.0": "Poké Gear 3.0",
  "TW:寶可齒輪3.0": "Poké Gear 3.0",
  "TW:通頂雪道": "Path to the Peak",
  "TW:多邊獸Ⅱ": "Porygon2",
  "TW:多邊獸Ｚ": "Porygon-Z",

  // Character/Supporter names (TW) — same characters as the JP entries above.
  "TW:妮莫": "Nemona",
  "TW:瑪俐": "Marnie",
  "TW:奇巴納": "Kabu",

  // --- Adjective+noun Trainer cards (not a Pokémon possessive) -----------
  "JP:パルデアの学生": "Paldean Student",
  "TW:帕底亞的學生": "Paldean Student",
  "JP:リーリエの決心": "Lillie's Determination",

  // --- Species-table mismatches (TW/CN) -----------------------------------
  // The upstream sindresorhus/pokemon table (scripts/data/pokemon-species-names.ts)
  // has these species under a string that doesn't match the real Pokémon
  // TCG's printed Traditional/Simplified Chinese name — same failure mode as
  // the Porygon2/Porygon-Z entries above, just discovered later from the
  // live catalog's unresolved-name worklist (pokemon-card-translations.review.json).
  // Each entry here is the actual printed name (cross-checked against
  // Bulbapedia and Chinese Pokémon wikis, verified by matching National
  // Dex number), not the upstream table's string. Only added for languages
  // where the catalog actually has unresolved rows using that name — see
  // pokemon-species-names.ts for what the (wrong) generated entry is.
  "TW:野蠻鱸魚": "Basculin",
  "TW:赫拉克羅斯": "Heracross",
  "TW:飄浮泡泡": "Castform",
  "TW:芽米": "Shaymin",
  "TW:沙河馬": "Hippopotas",
  "TW:滑滑小子": "Scraggy",
  "TW:掘地兔": "Diggersby",
  "TW:甲殼繭": "Silcoon",
  "TW:茸茸羊": "Flaaffy",
  "TW:火神蛾": "Volcarona",
  "CN:火神蛾": "Volcarona",
  "TW:爆炸頭水牛": "Bouffalant",
  "CN:爆炸頭水牛": "Bouffalant",
  "TW:鴨嘴炎獸": "Magmortar",
  "CN:鴨嘴炎獸": "Magmortar",
  "TW:沙基拉斯": "Pupitar",
  "CN:沙基拉斯": "Pupitar",
  "TW:泳圈鼬": "Buizel",
  "CN:泳圈鼬": "Buizel",
  "TW:烈箭鷹": "Talonflame",
  "CN:烈箭鷹": "Talonflame",
  "TW:彩粉蝶": "Vivillon",
  "CN:彩粉蝶": "Vivillon",
  "TW:粉蝶蟲": "Scatterbug",
  "CN:粉蝶蟲": "Scatterbug",
  "TW:咕咕鴿": "Tranquill",
  "TW:毒粉蛾": "Dustox",

  // --- Ogerpon mask forms --------------------------------------------------
  // Base name only (no suffix) — resolvePokemonCardNameEn re-attaches the
  // printed suffix (e.g. " ex") itself, so this also covers the "ex"
  // printings without a separate entry per suffix.
  "JP:オーガポン みどりのめん": "Ogerpon Teal Mask",
  "JP:オーガポン いしずえのめん": "Ogerpon Cornerstone Mask",
  "JP:オーガポン いどのめん": "Ogerpon Wellspring Mask",
  "JP:オーガポン かまどのめん": "Ogerpon Hearthflame Mask",
  "TW:厄鬼椪 碧草面具": "Ogerpon Teal Mask",
  "TW:厄鬼椪 礎石面具": "Ogerpon Cornerstone Mask",
  "TW:厄鬼椪 水井面具": "Ogerpon Wellspring Mask",
  "TW:厄鬼椪 火灶面具": "Ogerpon Hearthflame Mask",

  // --- Two-form species with their own English name, not a general prefix
  // (unlike Alolan/Galarian/Mega, "Ice Rider"/"Shadow Rider" and "Single
  // Strike"/"Rapid Strike" only ever pair with one species each) ----------
  "TW:白馬蕾冠王": "Ice Rider Calyrex",
  "TW:黑馬蕾冠王": "Shadow Rider Calyrex",
  "TW:一擊武道熊師": "Single Strike Urshifu",
  "TW:連擊武道熊師": "Rapid Strike Urshifu",

  // --- Common Trainer/Item/Energy cards, TW — verified against this
  // catalog's English rows and/or documented official English print names.
  "TW:粉碎之錘": "Crushing Hammer",
  "TW:足量水桶": "Capacious Bucket",
  "TW:極光能量": "Aurora Energy",
  "TW:雙重渦輪能量": "Double Turbo Energy",
  "TW:帕底亞的夥伴": "Paldean Partners",
  "CN:帕底亞的夥伴": "Paldean Partners",

  // --- Prefix+species combos where the species itself needs a table
  // override (see "Species-table mismatches" above) and so isn't reachable
  // through the regional-prefix loop, which only consults the generated
  // species table — needs the whole prefixed name spelled out here instead.
  "TW:洗翠 野蠻鱸魚": "Hisuian Basculin",
  "TW:洗翠的沉重球": "Hisuian Heavy Ball",
  "TW:光輝摔角鷹人": "Radiant Hawlucha",

  // --- Character Supporter cards (TW/CN) ----------------------------------
  "TW:希巴": "Bruno",
  "TW:阿響的冒險": "Ethan's Adventure",
  "CN:阿響的冒險": "Ethan's Adventure",
  "TW:莎娜": "Shauna",
  "TW:克拉拉": "Klara",
  "TW:可爾妮的氣勢": "Korrina's Focus",
  // Bare Supporter card named just for the character — distinct from the
  // "<Arven>的<species>" possessive pattern POKEMON_TRAINER_POSSESSIVES
  // handles, since resolvePossessive only fires when a particle is present.
  "TW:派帕": "Arven",
  // "Professor's Research" printed with the pictured professor's name in
  // parentheses — same card, different professor per printing (real,
  // distinct English cards, not a guessed pattern: Rowan/Magnolia/Sada/Turo
  // each have their own confirmed "Professor's Research (Professor X)"
  // release). 山梨博士 is Sinnoh's Professor Rowan (localization keeps his
  // tree-name theme with a different tree than the JP/EN "rowan"); 木蘭博士
  // is a direct-meaning translation of Magnolia (the flower); 奧琳博士 and
  // 弗圖博士 are phonetic renderings of Sada's JP name オーリム (Ohrim) and
  // Turo's English name respectively.
  "TW:博士的研究": "Professor's Research",
  "TW:博士的研究（山梨博士）": "Professor's Research (Professor Rowan)",
  "TW:博士的研究(木蘭博士)": "Professor's Research (Professor Magnolia)",
  "TW:博士的研究(奧琳博士)": "Professor's Research (Professor Sada)",
  "TW:博士的研究（弗圖博士）": "Professor's Research (Professor Turo)",
  // "Boss's Orders" printed with the pictured team boss's name in
  // parentheses, same pattern as Professor's Research above. 坂木 is
  // Giovanni's JP/CN name (Sakaki); 赤日 is this catalog's TW rendering of
  // Cyrus's JP name アカギ (Akagi).
  "TW:老大的指令（坂木）": "Boss's Orders (Giovanni)",
  "TW:老大的指令（赤日）": "Boss's Orders (Cyrus)",
  "TW:竹蘭的霸氣": "Cynthia's Ambition",
  "TW:一擊能量": "Single Strike Energy",
  "TW:雙子能量": "Twin Energy",

  // --- Species-table mismatches (TW/CN), continued — same verification
  // pattern as the block above (checked by Pokédex number against
  // Bulbapedia), found from the live catalog's unresolved-name worklist.
  "TW:醜醜魚": "Feebas",
  "CN:醜醜魚": "Feebas",
  "TW:圓絲蛛": "Spinarak",
  "TW:夜巡靈": "Duskull",
  "TW:彷徨夜靈": "Dusclops",
  "TW:黑夜魔靈": "Dusknoir",
  "TW:光電傘蜥": "Heliolisk",
  "TW:好啦魷": "Inkay",
  "TW:熔蟻獸": "Heatmor",
  "TW:蜻蜻蜓": "Yanma",
  "TW:幼基拉斯": "Larvitar",
  "TW:摔角鷹人": "Hawlucha",
  "TW:仙子伊布": "Sylveon",
  "TW:冰伊布": "Glaceon",
  "TW:月亮伊布": "Umbreon",
  "TW:葉伊布": "Leafeon",
  "TW:太陽伊布": "Espeon",
  "TW:班基拉斯": "Tyranitar",
  "TW:時拉比": "Celebi",
  "TW:奈克洛茲瑪": "Necrozma",
  "TW:帕路奇亞": "Palkia",
  "TW:三首惡龍": "Hydreigon",
  "TW:雙首暴龍": "Zweilous",
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
  // Team Rocket / Neo-era printed adjectives — real Japanese TCG mechanics
  // ("ダークギャラドス" Dark Gyarados, "ライトアルカニン" Light Arcanine,
  // "シャイニングチャリザード" Shining Charizard), not a translation choice.
  "JP:ダーク": "Dark",
  "JP:ライト": "Light",
  "JP:シャイニング": "Shining",
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
  "TW:光輝": "Radiant",
  "CN:光辉": "Radiant",
  // tcgdex's "zh-cn" text is inconsistently simplified (see resolveSpecies's
  // comment) — some CN rows print this prefix in Traditional characters, so
  // both spellings are registered under CN rather than relying on a
  // language-crossing fallback the way species names do.
  "CN:帕底亞": "Paldean",
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
export const POKEMON_TRAINER_POSSESSIVES: Record<string, string> = {
  "JP:N": "N",
  "JP:ロケット団": "Team Rocket",
  "JP:シロナ": "Cynthia",
  "JP:リーリエ": "Lillie",
  "JP:マリィ": "Marnie",
  "TW:竹蘭": "Cynthia",
  "CN:竹蘭": "Cynthia",
  "TW:阿響": "Ethan",
  "CN:阿響": "Ethan",
  "TW:派帕": "Arven",
  "CN:派帕": "Arven",
};
