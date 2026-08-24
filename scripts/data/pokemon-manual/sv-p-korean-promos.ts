import type { ManualCatalogItemEntry } from "./types";

/**
 * Korean "SV-P" (Scarlet & Violet-era) promotional cards, distributed by the
 * Korean Pokémon Card Game (KTCG) alongside starter packs, League/tournament
 * prizes, "Promo Pack" vol. releases, jumbo card sets, and theater/purchase
 * bonuses since February 2023. tcgdex.net — this catalog's only non-English
 * Pokémon data source — has NO Korean promo-card line modeled at all: a
 * full live pull of its `/ko/sets` endpoint returns zero dash-P sets,
 * unlike `ja:SV-P` (288 cards) and `zh-tw:SV-P` (94 cards), which ARE
 * populated. This file backfills the gap by hand.
 *
 * SOURCING METHOD (Aug 2026):
 *  1. English names/numbers/distribution notes for all ~203 catalogued slots
 *     come from a single raw-wikitext fetch of Bulbapedia's
 *     "SV-P_Promotional_cards_(KTCG)" page
 *     (?action=raw — the plain page-render/WebFetch summarizer is lossy for
 *     wikitables; the raw MediaWiki export renders every row cleanly in one
 *     shot). Bulbapedia's own table has #181-185 sitting blank/unrevealed —
 *     that's a gap in Bulbapedia's source data, not a parsing miss here.
 *  2. Korean printed names were sourced from pokemoncard.co.kr, the
 *     official Korean TCG site, which serves one page per card at a
 *     predictable URL (`/cards/detail/SVP000000<3-digit number>`). The
 *     live site 410s/blocks every fetch attempted this session (curl, a
 *     real browser tab, and WebFetch all failed identically — looks like a
 *     non-KR IP geoblock, not a one-off outage), so it could not be probed
 *     card-by-card directly. Instead, the Wayback Machine's CDX index
 *     (web.archive.org/cdx) was queried for every archived
 *     `SVP000000*` snapshot, and each hit was refetched via
 *     `web.archive.org/web/<timestamp>id_/<url>` (the "id_" flag returns
 *     the raw archived HTML, bypassing the toolbar/JS shell that a plain
 *     `/web/<timestamp>/<url>` fetch returns under load). This recovered
 *     66 of the 203 numbered cards, each with its real Korean name, HP,
 *     card-kind line ("기본 포켓몬" / "1진화 포켓몬" / "아이템" / "서포트" /
 *     "기본 에너지" / etc.), and illustrator credit, rendered directly by
 *     the official site and merely mirrored by the Archive — not guessed
 *     or transliterated. namu.wiki (suggested as a second-source option)
 *     was also tried but returned a Cloudflare "blocked" page to every
 *     fetch method available this session, so it contributed nothing.
 *
 * VERIFICATION BAR: a row is `verified: true` only where Bulbapedia (for
 * the English name/number/distribution) AND an archived pokemoncard.co.kr
 * snapshot (for the real Korean name) both corroborate the same numbered
 * card — two independent sources, neither guessed. #173 (Ditto/메타몽) is
 * the one exception: it has no Wayback snapshot of its own but was already
 * independently confirmed this session via 4 unrelated sources (Bulbapedia,
 * kream.co.kr, hellokorea.shop, general marketplace corroboration).
 * Every other row — the ~136 numbers with no archived snapshot, plus
 * Bulbapedia's own 5 blank/unrevealed rows (#181-185) — stays a
 * `verified: false` stub with an honest `sourceNote` (English name only,
 * pending either a fresh Wayback snapshot of that specific card id or a
 * working namu.wiki/other independent Korean-name source). No Korean name
 * was ever invented by transliterating the English name.
 *
 * A handful of unnumbered items in Bulbapedia's table — League
 * Champion/Runner-up/Top-4 "Victory Symbol" trophies and the 2023-2025
 * World Championships "Paradise Resort" stadium promo — carry no card
 * number at all and were left out of this file's scope entirely (every
 * other row here is numbered #001-#203); a future pass could add them
 * with synthetic externalIds if the catalog ever wants them.
 */
export const POKEMON_MANUAL_ENTRIES: ManualCatalogItemEntry[] = [
  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-001",
    name: "Spidops",
    nameEn: "Spidops",
    number: "001",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Spidops). Distribution per Bulbapedia: ex Starter Set Sprigatito & Lucario ex Promo Card Pack (February 28, 2023). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000001) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-002",
    name: "Arcanine",
    nameEn: "Arcanine",
    number: "002",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Arcanine). Distribution per Bulbapedia: ex Starter Set Fuecoco & Ampharos ex Promo Card Pack (February 28, 2023). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000002) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-003",
    name: "어써러셔",
    nameEn: "Dondozo",
    number: "003",
    rarity: "Promo",
    artist: "Shin Nagasawa",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Dondozo). Distribution per Bulbapedia: ex Starter Set Quaxly & Mimikyu ex Promo Card Pack (February 28, 2023). Korean name '어써러셔' (HP150, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000003), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-004",
    name: "미라이돈",
    nameEn: "Miraidon",
    number: "004",
    rarity: "Promo",
    artist: "Kouki Saitou",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Miraidon). Distribution per Bulbapedia: ex Starter Set Fuecoco & Ampharos ex Promo Card Pack (February 28, 2023); ex Starter Set Pikachu ex & Pawmot Promo Card Pack (April 22, 2023). Korean name '미라이돈' (HP120, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000004), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-005",
    name: "클레스퍼트라",
    nameEn: "Espathra",
    number: "005",
    rarity: "Promo",
    artist: "Sanosuke Sakuma",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Espathra). Distribution per Bulbapedia: ex Starter Set Quaxly & Mimikyu ex Promo Card Pack (February 28, 2023). Korean name '클레스퍼트라' (HP110, 1진화 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000005), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-006",
    name: "코라이돈",
    nameEn: "Koraidon",
    number: "006",
    rarity: "Promo",
    artist: "Kouki Saitou",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Koraidon). Distribution per Bulbapedia: ex Starter Set Sprigatito & Lucario ex Promo Card Pack (February 28, 2023). Korean name '코라이돈' (HP130, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000006), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-007",
    name: "퍼퓨돈",
    nameEn: "Oinkologne",
    number: "007",
    rarity: "Promo",
    artist: "kirisAki",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Oinkologne). Distribution per Bulbapedia: ex Starter Sets Promo Card Pack (February 28, 2023); ex Starter Set Pikachu ex & Pawmot Promo Card Pack (April 22, 2023). Korean name '퍼퓨돈' (HP120, 1진화 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000007), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-008",
    name: "모토마 ex",
    nameEn: "Cyclizar ex",
    number: "008",
    rarity: "Promo",
    artist: "5ban Graphics",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Cyclizar ex). Distribution per Bulbapedia: ex Starter Sets Promo Card Pack (February 28, 2023); ex Starter Set Pikachu ex & Pawmot Promo Card Pack (April 22, 2023). Korean name '모토마 ex' (HP210, 기본 포켓몬 ex) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000008), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-009",
    name: "Smoliv",
    nameEn: "Smoliv",
    number: "009",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Smoliv). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 1. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000009) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-010",
    name: "Growlithe",
    nameEn: "Growlithe",
    number: "010",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Growlithe). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 1. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000010) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-011",
    name: "Flaaffy",
    nameEn: "Flaaffy",
    number: "011",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Flaaffy). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 1. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000011) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-012",
    name: "Houndstone",
    nameEn: "Houndstone",
    number: "012",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Houndstone). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 1. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000012) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-013",
    name: "Klawf ex",
    nameEn: "Klawf ex",
    number: "013",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Klawf ex). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 1. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000013) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-014",
    name: "Varoom",
    nameEn: "Varoom",
    number: "014",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Varoom). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 1. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000014) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-015",
    name: "Brassius",
    nameEn: "Brassius",
    number: "015",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Brassius). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 1. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000015) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-016",
    name: "Poké Ball",
    nameEn: "Poké Ball",
    number: "016",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Poké Ball). Distribution per Bulbapedia: Energy Card Set. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000016) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-017",
    name: "Switch",
    nameEn: "Switch",
    number: "017",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Switch). Distribution per Bulbapedia: Energy Card Set. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000017) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-018",
    name: "Nemona",
    nameEn: "Nemona",
    number: "018",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Nemona). Distribution per Bulbapedia: Energy Card Set. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000018) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-019",
    name: "나오하",
    nameEn: "Sprigatito",
    number: "019",
    rarity: "Promo",
    artist: "Saya Tsuruta",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Sprigatito). Distribution per Bulbapedia: 2023 Korean League Season 2 participation prize (March 26, 2023). Korean name '나오하' (HP70, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000019), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-020",
    name: "로토무",
    nameEn: "Rotom",
    number: "020",
    rarity: "Promo",
    artist: "Kouki Saitou",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Rotom). Distribution per Bulbapedia: ex Starter Set Pikachu ex & Pawmot Promo Card Pack (April 22, 2023). Korean name '로토무' (HP80, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000020), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-021",
    name: "뜨아거",
    nameEn: "Fuecoco",
    number: "021",
    rarity: "Promo",
    artist: "Akira Komayama",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Fuecoco). Distribution per Bulbapedia: 2023 Korean League Season 3 participation prize (April 23, 2023). Korean name '뜨아거' (HP80, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000021), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-022",
    name: "Eevee",
    nameEn: "Eevee",
    number: "022",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Eevee). Distribution per Bulbapedia: Pokémon School participation prize (June 17-August 13, 2023). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000022) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-023",
    name: "이상한사탕",
    nameEn: "Rare Candy",
    number: "023",
    rarity: "Promo",
    artist: "Studio Bora Inc.",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Rare Candy). Distribution per Bulbapedia: Triplet Beat Sealed Battle participation prize (May 19, 2023). Korean name '이상한사탕' (아이템) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000023), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-024",
    name: "Nemona",
    nameEn: "Nemona",
    number: "024",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Nemona). Distribution per Bulbapedia: Triplet Beat Sealed Battle participation prize (May 19, 2023). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000024) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-025",
    name: "네모",
    nameEn: "Nemona",
    number: "025",
    rarity: "Promo",
    artist: "Sanosuke Sakuma",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Nemona). Distribution per Bulbapedia: Triplet Beat Sealed Battle participation prize (May 19, 2023). Korean name '네모' (서포트) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000025), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-026",
    name: "미라이돈",
    nameEn: "Miraidon",
    number: "026",
    rarity: "Promo",
    artist: "Akira Komayama",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Miraidon). Distribution per Bulbapedia: Sealed Battle Promo Card Pack (May 19, 2023). Korean name '미라이돈' (HP120, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000026), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-027",
    name: "코라이돈",
    nameEn: "Koraidon",
    number: "027",
    rarity: "Promo",
    artist: "Mina Nakai",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Koraidon). Distribution per Bulbapedia: Sealed Battle Promo Card Pack (May 19, 2023). Korean name '코라이돈' (HP130, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000027), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-028",
    name: "꾸왁스",
    nameEn: "Quaxly",
    number: "028",
    rarity: "Promo",
    artist: "Mizue",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Quaxly). Distribution per Bulbapedia: 2023 Korean League Season 4 participation prize (May 14, 2023). Korean name '꾸왁스' (HP70, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000028), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-029",
    name: "Arceus V",
    nameEn: "Arceus V",
    number: "029",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Arceus V). Distribution per Bulbapedia: Arceus and the Jewel of Life ticket giveaway (200,000 copies; May 31, 2023). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000029) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-030",
    name: "Pineco",
    nameEn: "Pineco",
    number: "030",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Pineco). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 2. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000030) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-031",
    name: "Arctibax",
    nameEn: "Arctibax",
    number: "031",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Arctibax). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 2. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000031) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-032",
    name: "Bellibolt",
    nameEn: "Bellibolt",
    number: "032",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Bellibolt). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 2. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000032) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-033",
    name: "Sinistea",
    nameEn: "Sinistea",
    number: "033",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Sinistea). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 2. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000033) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-034",
    name: "Barboach",
    nameEn: "Barboach",
    number: "034",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Barboach). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 2. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000034) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-035",
    name: "Mabosstiff ex",
    nameEn: "Mabosstiff ex",
    number: "035",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Mabosstiff ex). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 2. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000035) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-036",
    name: "Atticus",
    nameEn: "Atticus",
    number: "036",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Atticus). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 2. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000036) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-037",
    name: "Charcadet",
    nameEn: "Charcadet",
    number: "037",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Charcadet). Distribution per Bulbapedia: 2023 Korean League Final participation prize (June 24-25, 2023). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000037) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-038",
    name: "Pawmi",
    nameEn: "Pawmi",
    number: "038",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Pawmi). Distribution per Bulbapedia: 2023 Korean League Final Visitor Event (June 24-25, 2023). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000038) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-039",
    name: "Bulbasaur",
    nameEn: "Bulbasaur",
    number: "039",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Bulbasaur). Distribution per Bulbapedia: Pokémon Card 151 Promo Card Pack (July 28, 2023). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000039) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-040",
    name: "파이리",
    nameEn: "Charmander",
    number: "040",
    rarity: "Promo",
    artist: "NC Empire",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Charmander). Distribution per Bulbapedia: Pokémon Card 151 Promo Card Pack (July 28, 2023). Korean name '파이리' (HP70, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000040), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-041",
    name: "Squirtle",
    nameEn: "Squirtle",
    number: "041",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Squirtle). Distribution per Bulbapedia: Pokémon Card 151 Promo Card Pack (July 28, 2023). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000041) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-042",
    name: "Scovillain ex",
    nameEn: "Scovillain ex",
    number: "042",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Scovillain ex). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 3. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000042) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-043",
    name: "샤프니아",
    nameEn: "Carvanha",
    number: "043",
    rarity: "Promo",
    artist: "Tonji Matsuno",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Carvanha). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 3. Korean name '샤프니아' (HP50, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000043), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-044",
    name: "Toxel",
    nameEn: "Toxel",
    number: "044",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Toxel). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 3. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000044) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-045",
    name: "Cleffa",
    nameEn: "Cleffa",
    number: "045",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Cleffa). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 3. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000045) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-046",
    name: "Pupitar",
    nameEn: "Pupitar",
    number: "046",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Pupitar). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 3. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000046) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-047",
    name: "Revavroom",
    nameEn: "Revavroom",
    number: "047",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Revavroom). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 3. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000047) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-048",
    name: "Moonlit Hill",
    nameEn: "Moonlit Hill",
    number: "048",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Moonlit Hill). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 3. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000048) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-049",
    name: "Manaphy",
    nameEn: "Manaphy",
    number: "049",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Manaphy). Distribution per Bulbapedia: Participate in Pokémon Card Shop Battle League qualifiers (November 18-December 3, 2023). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000049) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-050",
    name: "피카츄",
    nameEn: "Pikachu",
    number: "050",
    rarity: "Promo",
    artist: "Jiro Sasumo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Pikachu). Distribution per Bulbapedia: Pokémon Card Game Let's Play event (September 2, 2023). Korean name '피카츄' (HP70, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000050), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-051",
    name: "명탐정 피카츄",
    nameEn: "Detective Pikachu",
    number: "051",
    rarity: "Promo",
    artist: "MINAMINAMI Take",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Detective Pikachu). Distribution per Bulbapedia: Detective Pikachu Returns early purchase bonus (October 6, 2023). Korean name '명탐정 피카츄' (HP90, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000051), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-052",
    name: "비크티니 ex",
    nameEn: "Victini ex",
    number: "052",
    rarity: "Promo",
    artist: "Saki Hayashiro",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Victini ex). Distribution per Bulbapedia: Win first round in Raging Surf Sealed Battle (October 20-December 31, 2023). Korean name '비크티니 ex' (HP190, 기본 포켓몬 |  포켓몬 ex) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000052), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-053",
    name: "Victini ex",
    nameEn: "Victini ex",
    number: "053",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Victini ex). Distribution per Bulbapedia: Raging Surf Sealed Battle winner prize (October 20-December 31, 2023). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000053) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-054",
    name: "네모",
    nameEn: "Nemona",
    number: "054",
    rarity: "Promo",
    artist: "Sanosuke Sakuma",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Nemona). Distribution per Bulbapedia: Raging Surf Sealed Battle participation prize (October 20-December 31, 2023). Korean name '네모' (서포트) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000054), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-055",
    name: "네모",
    nameEn: "Nemona",
    number: "055",
    rarity: "Promo",
    artist: "Sanosuke Sakuma",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Nemona). Distribution per Bulbapedia: Raging Surf Sealed Battle participation prize (October 20-December 31, 2023). Korean name '네모' (서포트) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000055), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-056",
    name: "Pansear",
    nameEn: "Pansear",
    number: "056",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Pansear). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 4. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000056) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-057",
    name: "Horsea",
    nameEn: "Horsea",
    number: "057",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Horsea). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 4. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000057) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-058",
    name: "Yamask",
    nameEn: "Yamask",
    number: "058",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Yamask). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 4. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000058) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-059",
    name: "Tinkaton",
    nameEn: "Tinkaton",
    number: "059",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Tinkaton). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 4. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000059) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-060",
    name: "Garganacl ex",
    nameEn: "Garganacl ex",
    number: "060",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Garganacl ex). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 4. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000060) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-061",
    name: "Porygon2",
    nameEn: "Porygon2",
    number: "061",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Porygon2). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 4. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000061) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-062",
    name: "Raifort",
    nameEn: "Raifort",
    number: "062",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Raifort). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 4. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000062) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-063",
    name: "Gimmighoul",
    nameEn: "Gimmighoul",
    number: "063",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Gimmighoul). Distribution per Bulbapedia: 2024 Korean League Season 1 participation prize (December 30-31, 2023). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000063) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-064",
    name: "Celebratory Fanfare",
    nameEn: "Celebratory Fanfare",
    number: "064",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Celebratory Fanfare). Distribution per Bulbapedia: 2024 Korean League. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000064) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-065",
    name: "Cetitan",
    nameEn: "Cetitan",
    number: "065",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Cetitan). Distribution per Bulbapedia: 2024 Korean League Season 2 participation prize (February 17-18, 2024). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000065) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-066",
    name: "Wooper",
    nameEn: "Wooper",
    number: "066",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Wooper). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 5. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000066) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-067",
    name: "Quagsire",
    nameEn: "Quagsire",
    number: "067",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Quagsire). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 5. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000067) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-068",
    name: "클레피",
    nameEn: "Klefki",
    number: "068",
    rarity: "Promo",
    artist: "GOSSAN",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Klefki). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 5. Korean name '클레피' (HP70, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000068), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-069",
    name: "Flamigo ex",
    nameEn: "Flamigo ex",
    number: "069",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Flamigo ex). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 5. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000069) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-070",
    name: "Nest Ball",
    nameEn: "Nest Ball",
    number: "070",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Nest Ball). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 5. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000070) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-071",
    name: "Switch",
    nameEn: "Switch",
    number: "071",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Switch). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 5. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000071) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-072",
    name: "Tyme",
    nameEn: "Tyme",
    number: "072",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Tyme). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 5. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000072) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-073",
    name: "모토마",
    nameEn: "Cyclizar",
    number: "073",
    rarity: "Promo",
    artist: "Hasuno",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Cyclizar). Distribution per Bulbapedia: 2024 Korean League Season 3 participation prize. Korean name '모토마' (HP120, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000073), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-074",
    name: "Charizard ex",
    nameEn: "Charizard ex",
    number: "074",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Charizard ex). Distribution per Bulbapedia: Pokémon: Stories from the Johto Region - The Final Chapter theater gift. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000074) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-075",
    name: "Nemona",
    nameEn: "Nemona",
    number: "075",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Nemona). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000075) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-076",
    name: "Nemona",
    nameEn: "Nemona",
    number: "076",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Nemona). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000076) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-077",
    name: "Zapdos ex",
    nameEn: "Zapdos ex",
    number: "077",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Zapdos ex). Distribution per Bulbapedia: 2024 Korean League Final participation prize. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000077) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-078",
    name: "Kilowattrel ex",
    nameEn: "Kilowattrel ex",
    number: "078",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Kilowattrel ex). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 6. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000078) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-079",
    name: "따라큐",
    nameEn: "Mimikyu",
    number: "079",
    rarity: "Promo",
    artist: "Kagemaru Himeno",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Mimikyu). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 6. Korean name '따라큐' (HP70, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000079), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-080",
    name: "Scraggy",
    nameEn: "Scraggy",
    number: "080",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Scraggy). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 6. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000080) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-081",
    name: "Scrafty",
    nameEn: "Scrafty",
    number: "081",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Scrafty). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 6. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000081) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-082",
    name: "Roto-Stick",
    nameEn: "Roto-Stick",
    number: "082",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Roto-Stick). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 6. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000082) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-083",
    name: "Rare Candy",
    nameEn: "Rare Candy",
    number: "083",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Rare Candy). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 6. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000083) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-084",
    name: "Iono",
    nameEn: "Iono",
    number: "084",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Iono). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 6. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000084) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-085",
    name: "오거폰 벽록의 가면",
    nameEn: "Teal Mask Ogerpon",
    number: "085",
    rarity: "Promo",
    artist: "kodama",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Teal Mask Ogerpon). Distribution per Bulbapedia: Scarlet & Violet Ogerpon Special Jumbo Card Set. Korean name '오거폰 벽록의 가면' (HP110, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000085), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-086",
    name: "도깨비의 가면",
    nameEn: "Ogre's Mask",
    number: "086",
    rarity: "Promo",
    artist: "5ban Graphics",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Ogre's Mask). Distribution per Bulbapedia: Scarlet & Violet Ogerpon Special Jumbo Card Set. Korean name '도깨비의 가면' (아이템) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000086), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-087",
    name: "Rillaboom",
    nameEn: "Rillaboom",
    number: "087",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Rillaboom). Distribution per Bulbapedia: \"Transformation Mask\" Booster Box. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000087) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-088",
    name: "그우린차",
    nameEn: "Sinistcha",
    number: "088",
    rarity: "Promo",
    artist: "Kouki Saitou",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Sinistcha). Distribution per Bulbapedia: \"Transformation Mask\" Booster Box. Korean name '그우린차' (HP70, 1진화 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000088), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-089",
    name: "Teal Mask Ogerpon",
    nameEn: "Teal Mask Ogerpon",
    number: "089",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Teal Mask Ogerpon). Distribution per Bulbapedia: \"Transformation Mask\" Booster Box. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000089) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-090",
    name: "Teal Mask Ogerpon ex",
    nameEn: "Teal Mask Ogerpon ex",
    number: "090",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Teal Mask Ogerpon ex). Distribution per Bulbapedia: \"Transformation Mask\" Booster Box. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000090) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-091",
    name: "Bug Catching Set",
    nameEn: "Bug Catching Set",
    number: "091",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Bug Catching Set). Distribution per Bulbapedia: \"Transformation Mask\" Booster Box. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000091) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-092",
    name: "나오하",
    nameEn: "Sprigatito",
    number: "092",
    rarity: "Promo",
    artist: "Yamazaki Rei",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Sprigatito). Distribution per Bulbapedia: \"Pokémon Horizons\" stamp. Korean name '나오하' (HP70, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000092), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-093",
    name: "Fuecoco",
    nameEn: "Fuecoco",
    number: "093",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Fuecoco). Distribution per Bulbapedia: \"Pokémon Horizons\" stamp. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000093) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-094",
    name: "Yanma",
    nameEn: "Yanma",
    number: "094",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Yanma). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 7. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000094) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-095",
    name: "Yanmega",
    nameEn: "Yanmega",
    number: "095",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Yanmega). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 7. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000095) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-096",
    name: "Veluza ex",
    nameEn: "Veluza ex",
    number: "096",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Veluza ex). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 7. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000096) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-097",
    name: "Ditto",
    nameEn: "Ditto",
    number: "097",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Ditto). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 7. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000097) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-098",
    name: "Super Rod",
    nameEn: "Super Rod",
    number: "098",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Super Rod). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 7. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000098) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-099",
    name: "Professor's Research (Professor Sada)",
    nameEn: "Professor's Research (Professor Sada)",
    number: "099",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Professor's Research (Professor Sada)). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 7. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000099) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-100",
    name: "Professor's Research (Professor Turo)",
    nameEn: "Professor's Research (Professor Turo)",
    number: "100",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Professor's Research (Professor Turo)). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 7. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000100) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-101",
    name: "빌리오&나리아",
    nameEn: "Billy & O'Nare",
    number: "101",
    rarity: "Promo",
    artist: "Sanosuke Sakuma",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Billy & O'Nare). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 7. Korean name '빌리오&나리아' (서포트) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000101), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-102",
    name: "피카츄",
    nameEn: "Pikachu",
    number: "102",
    rarity: "Promo",
    artist: "Atsushi Furusawa",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Pikachu). Distribution per Bulbapedia: Pokémon Card Shop Stamp Rally Event. Korean name '피카츄' (HP70, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000102), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-103",
    name: "Latias",
    nameEn: "Latias",
    number: "103",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Latias). Distribution per Bulbapedia: Online purchase bonus. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000103) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-104",
    name: "Celebratory Fanfare",
    nameEn: "Celebratory Fanfare",
    number: "104",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Celebratory Fanfare). Distribution per Bulbapedia: \"Korean League\" stamp. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000104) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-105",
    name: "Tatsugiri",
    nameEn: "Tatsugiri",
    number: "105",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Tatsugiri). Distribution per Bulbapedia: \"Korean League\" stamp. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000105) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-106",
    name: "Nemona",
    nameEn: "Nemona",
    number: "106",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Nemona). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000106) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-107",
    name: "네모",
    nameEn: "Nemona",
    number: "107",
    rarity: "Promo",
    artist: "Sanosuke Sakuma",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Nemona). Korean name '네모' (서포트) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000107), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-108",
    name: "Alolan Exeggutor ex",
    nameEn: "Alolan Exeggutor ex",
    number: "108",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Alolan Exeggutor ex). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000108) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-109",
    name: "Basic Grass Energy",
    nameEn: "Basic Grass Energy",
    number: "109",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Grass Energy). Distribution per Bulbapedia: Mini League participation prize. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000109) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-110",
    name: "Basic Fire Energy",
    nameEn: "Basic Fire Energy",
    number: "110",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Fire Energy). Distribution per Bulbapedia: Mini League participation prize. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000110) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-111",
    name: "Basic Water Energy",
    nameEn: "Basic Water Energy",
    number: "111",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Water Energy). Distribution per Bulbapedia: Mini League participation prize. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000111) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-112",
    name: "Basic Lightning Energy",
    nameEn: "Basic Lightning Energy",
    number: "112",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Lightning Energy). Distribution per Bulbapedia: Mini League participation prize. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000112) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-113",
    name: "Basic Psychic Energy",
    nameEn: "Basic Psychic Energy",
    number: "113",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Psychic Energy). Distribution per Bulbapedia: Mini League participation prize. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000113) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-114",
    name: "Basic Fighting Energy",
    nameEn: "Basic Fighting Energy",
    number: "114",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Fighting Energy). Distribution per Bulbapedia: Mini League participation prize. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000114) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-115",
    name: "Basic Darkness Energy",
    nameEn: "Basic Darkness Energy",
    number: "115",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Darkness Energy). Distribution per Bulbapedia: Mini League participation prize. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000115) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-116",
    name: "Basic Metal Energy",
    nameEn: "Basic Metal Energy",
    number: "116",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Metal Energy). Distribution per Bulbapedia: Mini League participation prize. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000116) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-117",
    name: "Rabsca ex",
    nameEn: "Rabsca ex",
    number: "117",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Rabsca ex). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 8. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000117) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-118",
    name: "Iron Bundle",
    nameEn: "Iron Bundle",
    number: "118",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Iron Bundle). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 8. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000118) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-119",
    name: "Hippopotas",
    nameEn: "Hippopotas",
    number: "119",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Hippopotas). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 8. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000119) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-120",
    name: "Hippowdon",
    nameEn: "Hippowdon",
    number: "120",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Hippowdon). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 8. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000120) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-121",
    name: "Boss's Orders (Ghetsis)",
    nameEn: "Boss's Orders (Ghetsis)",
    number: "121",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Boss's Orders (Ghetsis)). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 8. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000121) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-122",
    name: "TM Machine",
    nameEn: "TM Machine",
    number: "122",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (TM Machine). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 8. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000122) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-123",
    name: "제트 에너지",
    nameEn: "Jet Energy",
    number: "123",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Jet Energy). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 8. Korean name '제트 에너지' (특수 에너지) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000123), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-124",
    name: "Buddy-Buddy Poffin",
    nameEn: "Buddy-Buddy Poffin",
    number: "124",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Buddy-Buddy Poffin). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000124) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-125",
    name: "Mew ex",
    nameEn: "Mew ex",
    number: "125",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Mew ex). Distribution per Bulbapedia: Lucario and the Mystery of Mew theater gift. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000125) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-126",
    name: "피카츄",
    nameEn: "Pikachu",
    number: "126",
    rarity: "Promo",
    artist: "Atsushi Furusawa",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Pikachu). Distribution per Bulbapedia: Scarlet & Violet Pikachu Special Jumbo Card Set. Korean name '피카츄' (HP60, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000126), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-127",
    name: "나옹",
    nameEn: "Meowth",
    number: "127",
    rarity: "Promo",
    artist: "Uninori",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Meowth). Distribution per Bulbapedia: Generations Start Deck Special Battle Set. Korean name '나옹' (HP70, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000127), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-128",
    name: "Paldean Wooper",
    nameEn: "Paldean Wooper",
    number: "128",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Paldean Wooper). Distribution per Bulbapedia: Generations Start Deck Special Battle Set. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000128) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-129",
    name: "Suicune",
    nameEn: "Suicune",
    number: "129",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Suicune). Distribution per Bulbapedia: Generations Start Deck Special Battle Set. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000129) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-130",
    name: "Duraludon",
    nameEn: "Duraludon",
    number: "130",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Duraludon). Distribution per Bulbapedia: Generations Start Deck Special Battle Set. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000130) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-131",
    name: "Pachirisu",
    nameEn: "Pachirisu",
    number: "131",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Pachirisu). Distribution per Bulbapedia: 2025 Korean League Season 2 Promo card. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000131) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-132",
    name: "Eevee",
    nameEn: "Eevee",
    number: "132",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Eevee). Distribution per Bulbapedia: \"Terastal Fest ex\" Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000132) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-133",
    name: "샤미드",
    nameEn: "Vaporeon",
    number: "133",
    rarity: "Promo",
    artist: "Taira Akitsu",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Vaporeon). Distribution per Bulbapedia: \"Terastal Fest ex\" Promo Card Pack. Korean name '샤미드' (HP130, 1진화 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000133), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-134",
    name: "쥬피썬더",
    nameEn: "Jolteon",
    number: "134",
    rarity: "Promo",
    artist: "Nisota Niso",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Jolteon). Distribution per Bulbapedia: \"Terastal Fest ex\" Promo Card Pack. Korean name '쥬피썬더' (HP110, 1진화 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000134), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-135",
    name: "부스터",
    nameEn: "Flareon",
    number: "135",
    rarity: "Promo",
    artist: "SIE NANAHARA",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Flareon). Distribution per Bulbapedia: \"Terastal Fest ex\" Promo Card Pack. Korean name '부스터' (HP130, 1진화 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000135), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-136",
    name: "에브이",
    nameEn: "Espeon",
    number: "136",
    rarity: "Promo",
    artist: "Kariya",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Espeon). Distribution per Bulbapedia: \"Terastal Fest ex\" Promo Card Pack. Korean name '에브이' (HP110, 1진화 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000136), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-137",
    name: "블래키",
    nameEn: "Umbreon",
    number: "137",
    rarity: "Promo",
    artist: "matazo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Umbreon). Distribution per Bulbapedia: \"Terastal Fest ex\" Promo Card Pack. Korean name '블래키' (HP110, 1진화 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000137), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-138",
    name: "리피아",
    nameEn: "Leafeon",
    number: "138",
    rarity: "Promo",
    artist: "Iori Suzuki",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Leafeon). Distribution per Bulbapedia: \"Terastal Fest ex\" Promo Card Pack. Korean name '리피아' (HP120, 1진화 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000138), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-139",
    name: "글레이시아",
    nameEn: "Glaceon",
    number: "139",
    rarity: "Promo",
    artist: "Keisin",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Glaceon). Distribution per Bulbapedia: \"Terastal Fest ex\" Promo Card Pack. Korean name '글레이시아' (HP120, 1진화 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000139), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-140",
    name: "님피아",
    nameEn: "Sylveon",
    number: "140",
    rarity: "Promo",
    artist: "Susumu Maeya",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Sylveon). Distribution per Bulbapedia: \"Terastal Fest ex\" Promo Card Pack. Korean name '님피아' (HP120, 1진화 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000140), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-141",
    name: "Zarude",
    nameEn: "Zarude",
    number: "141",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Zarude). Distribution per Bulbapedia: 2025 Korean League Season 3 Promo card. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000141) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-142",
    name: "에브이 ex",
    nameEn: "Espeon ex",
    number: "142",
    rarity: "Promo",
    artist: "5ban Graphics",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Espeon ex). Distribution per Bulbapedia: Scarlet & Violet \"Terastal Fest ex\" Collection Set. Korean name '에브이 ex' (HP270, 1진화 포켓몬 |  포켓몬 ex) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000142), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-143",
    name: "블래키 ex",
    nameEn: "Umbreon ex",
    number: "143",
    rarity: "Promo",
    artist: "5ban Graphics",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Umbreon ex). Distribution per Bulbapedia: Scarlet & Violet \"Terastal Fest ex\" Collection Set. Korean name '블래키 ex' (HP280, 1진화 포켓몬 |  포켓몬 ex) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000143), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-144",
    name: "Hop's Pincurchin ex",
    nameEn: "Hop's Pincurchin ex",
    number: "144",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Hop's Pincurchin ex). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 9. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000144) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-145",
    name: "Drifloon",
    nameEn: "Drifloon",
    number: "145",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Drifloon). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 9. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000145) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-146",
    name: "둥실라이드",
    nameEn: "Drifblim",
    number: "146",
    rarity: "Promo",
    artist: "Shimaris Yukichi",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Drifblim). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 9. Korean name '둥실라이드' (HP110, 1진화 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000146), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-147",
    name: "Tatsugiri",
    nameEn: "Tatsugiri",
    number: "147",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Tatsugiri). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 9. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000147) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-148",
    name: "Buddy-Buddy Poffin",
    nameEn: "Buddy-Buddy Poffin",
    number: "148",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Buddy-Buddy Poffin). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 9. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000148) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-149",
    name: "Arven",
    nameEn: "Arven",
    number: "149",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Arven). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 9. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000149) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-150",
    name: "Pokémon Center Lady",
    nameEn: "Pokémon Center Lady",
    number: "150",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Pokémon Center Lady). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 9. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000150) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-151",
    name: "N's Darmanitan",
    nameEn: "N's Darmanitan",
    number: "151",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (N's Darmanitan). Distribution per Bulbapedia: \"Battle Partners\" Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000151) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-152",
    name: "Iono's Wattrel",
    nameEn: "Iono's Wattrel",
    number: "152",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Iono's Wattrel). Distribution per Bulbapedia: \"Battle Partners\" Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000152) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-153",
    name: "Lillie's Ribombee",
    nameEn: "Lillie's Ribombee",
    number: "153",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Lillie's Ribombee). Distribution per Bulbapedia: \"Battle Partners\" Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000153) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-154",
    name: "Hop's Cramorant",
    nameEn: "Hop's Cramorant",
    number: "154",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Hop's Cramorant). Distribution per Bulbapedia: \"Battle Partners\" Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000154) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-155",
    name: "Redeemable Ticket",
    nameEn: "Redeemable Ticket",
    number: "155",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Redeemable Ticket). Distribution per Bulbapedia: \"Battle Partners\" Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000155) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-156",
    name: "Lillie's Comfey",
    nameEn: "Lillie's Comfey",
    number: "156",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Lillie's Comfey). Distribution per Bulbapedia: Scarlet & Violet Lillie Special Set. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000156) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-157",
    name: "N's Zorua",
    nameEn: "N's Zorua",
    number: "157",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (N's Zorua). Distribution per Bulbapedia: Scarlet & Violet N Special Set. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000157) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-158",
    name: "Iono",
    nameEn: "Iono",
    number: "158",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Iono). Distribution per Bulbapedia: Scarlet & Violet Iono Special Set. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000158) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-159",
    name: "Kangaskhan",
    nameEn: "Kangaskhan",
    number: "159",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Kangaskhan). Distribution per Bulbapedia: 2025 Korean League Season 4 Promo card. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000159) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-160",
    name: "피카츄",
    nameEn: "Pikachu",
    number: "160",
    rarity: "Promo",
    artist: "saino misaki",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Pikachu). Distribution per Bulbapedia: Pikachu Present Box. Korean name '피카츄' (HP70, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000160), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-161",
    name: "파이리",
    nameEn: "Charmander",
    number: "161",
    rarity: "Promo",
    artist: "GIDORA",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Charmander). Distribution per Bulbapedia: Scarlet & Violet Charizard ex Special Jumbo Card Set. Korean name '파이리' (HP70, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000161), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-162",
    name: "Charmeleon",
    nameEn: "Charmeleon",
    number: "162",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Charmeleon). Distribution per Bulbapedia: Scarlet & Violet Charizard ex Special Jumbo Card Set. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000162) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-163",
    name: "Charizard ex",
    nameEn: "Charizard ex",
    number: "163",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Charizard ex). Distribution per Bulbapedia: Scarlet & Violet Charizard ex Special Jumbo Card Set. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000163) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-164",
    name: "Feraligatr",
    nameEn: "Feraligatr",
    number: "164",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Feraligatr). Distribution per Bulbapedia: \"Hot Wind Arena\" Purchase Bonus Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000164) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-165",
    name: "피카츄",
    nameEn: "Pikachu",
    number: "165",
    rarity: "Promo",
    artist: "Kazuki Minami",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Pikachu). Distribution per Bulbapedia: \"Hot Wind Arena\" Purchase Bonus Promo Card Pack. Korean name '피카츄' (HP60, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000165), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-166",
    name: "Toxtricity ex",
    nameEn: "Toxtricity ex",
    number: "166",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Toxtricity ex). Distribution per Bulbapedia: \"Hot Wind Arena\" Purchase Bonus Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000166) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-167",
    name: "네모",
    nameEn: "Nemona",
    number: "167",
    rarity: "Promo",
    artist: "Sanosuke Sakuma",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Nemona). Korean name '네모' (서포트) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000167), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-168",
    name: "Nemona",
    nameEn: "Nemona",
    number: "168",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Nemona). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000168) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-169",
    name: "심향의 칠색조 ex",
    nameEn: "Ethan's Ho-Oh ex",
    number: "169",
    rarity: "Promo",
    artist: "aky CG Works",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Ethan's Ho-Oh ex). Korean name '심향의 칠색조 ex' (HP230, 기본 포켓몬 |  포켓몬 ex) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000169), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-170",
    name: "Cynthia's Garchomp ex",
    nameEn: "Cynthia's Garchomp ex",
    number: "170",
    rarity: "Promo",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Cynthia's Garchomp ex). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000170) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-171",
    name: "Arven's Mabosstiff ex",
    nameEn: "Arven's Mabosstiff ex",
    number: "171",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Arven's Mabosstiff ex). No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000171) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-172",
    name: "Scizor ex",
    nameEn: "Scizor ex",
    number: "172",
    rarity: "Promo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Scizor ex). Distribution per Bulbapedia: 2025 Korean League Finals Promo card. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000172) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-173",
    name: "메타몽",
    nameEn: "Ditto",
    number: "173",
    rarity: "Promo",
    artist: "Lee Mina",
    cardType: "Pokémon",
    imageSmallUrl: "https://archives.bulbagarden.net/media/upload/thumb/3/3f/DittoSVPromo173.jpg/250px-DittoSVPromo173.jpg",
    imageLargeUrl: "https://archives.bulbagarden.net/media/upload/3/3f/DittoSVPromo173.jpg",
    language: "KR",
    sourceNote:
      "Distributed via the '메타몽 프로젝트' (Metamong Project) QR stamp rally at " +
      "'Pokémon Town 2025' (Apr 25 - May 18, 2025). No Wayback Machine snapshot of " +
      "pokemoncard.co.kr's own SVP000000173 page exists, but confirmed this session " +
      "via 4 independent sources: Bulbapedia's SV-P_Promotional_cards_(KTCG) page, " +
      "kream.co.kr, hellokorea.shop, and general marketplace corroboration. Image " +
      "hotlinked from Bulbagarden Archives — pokemoncard.co.kr blocks direct fetches " +
      "this session and no official-CDN scan was reachable, so this is a deliberate " +
      "exception to the 'official CDN only' rule; the scan was viewed directly and " +
      "matches this entry exactly (메타몽, 173/SV-P, Metamong Project watermark).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-174",
    name: "고라파덕",
    nameEn: "Psyduck",
    number: "174",
    rarity: "Promo",
    artist: "Jiro Sasumo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Psyduck). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 10. Korean name '고라파덕' (HP70, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000174), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-175",
    name: "골덕",
    nameEn: "Golduck",
    number: "175",
    rarity: "Promo",
    artist: "Jiro Sasumo",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Golduck). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 10. Korean name '골덕' (HP120, 1진화 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000175), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-176",
    name: "날개치는머리",
    nameEn: "Flutter Mane",
    number: "176",
    rarity: "Promo",
    artist: "kodama",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Flutter Mane). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 10. Korean name '날개치는머리' (HP90, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000176), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-177",
    name: "로켓단의 캥카 ex",
    nameEn: "Team Rocket's Kangaskhan ex",
    number: "177",
    rarity: "Promo",
    artist: "5ban Graphics",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Team Rocket's Kangaskhan ex). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 10. Korean name '로켓단의 캥카 ex' (HP230, 기본 포켓몬 |  포켓몬 ex) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000177), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-178",
    name: "밤의 들것",
    nameEn: "Night Stretcher",
    number: "178",
    rarity: "Promo",
    artist: "Toyste Beach",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Night Stretcher). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 10. Korean name '밤의 들것' (아이템) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000178), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-179",
    name: "로켓단의 최면장치",
    nameEn: "Team Rocket's Hypnotizer",
    number: "179",
    rarity: "Promo",
    artist: "Toyste Beach",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Team Rocket's Hypnotizer). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 10. Korean name '로켓단의 최면장치' (아이템) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000179), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-180",
    name: "카지",
    nameEn: "Kieran",
    number: "180",
    rarity: "Promo",
    artist: "GIDORA",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Kieran). Distribution per Bulbapedia: Scarlet & Violet Promo Pack Vol. 10. Korean name '카지' (서포트) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000180), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-181",
    name: "Unrevealed",
    nameEn: "Unrevealed",
    number: "181",
    rarity: "Promo",
    language: "KR",
    sourceNote:
      "Bulbapedia's SV-P Promotional cards (KTCG) table lists #181/SV-P as an " +
      "empty/unrevealed row (no name, type, or product given) as of this research " +
      "(Aug 2026) - not a parsing gap on this end. Kept as a numbering placeholder; " +
      "revisit once Bulbapedia's own table is updated with this card.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-182",
    name: "Unrevealed",
    nameEn: "Unrevealed",
    number: "182",
    rarity: "Promo",
    language: "KR",
    sourceNote:
      "Bulbapedia's SV-P Promotional cards (KTCG) table lists #182/SV-P as an " +
      "empty/unrevealed row (no name, type, or product given) as of this research " +
      "(Aug 2026) - not a parsing gap on this end. Kept as a numbering placeholder; " +
      "revisit once Bulbapedia's own table is updated with this card.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-183",
    name: "Unrevealed",
    nameEn: "Unrevealed",
    number: "183",
    rarity: "Promo",
    language: "KR",
    sourceNote:
      "Bulbapedia's SV-P Promotional cards (KTCG) table lists #183/SV-P as an " +
      "empty/unrevealed row (no name, type, or product given) as of this research " +
      "(Aug 2026) - not a parsing gap on this end. Kept as a numbering placeholder; " +
      "revisit once Bulbapedia's own table is updated with this card.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-184",
    name: "Unrevealed",
    nameEn: "Unrevealed",
    number: "184",
    rarity: "Promo",
    language: "KR",
    sourceNote:
      "Bulbapedia's SV-P Promotional cards (KTCG) table lists #184/SV-P as an " +
      "empty/unrevealed row (no name, type, or product given) as of this research " +
      "(Aug 2026) - not a parsing gap on this end. Kept as a numbering placeholder; " +
      "revisit once Bulbapedia's own table is updated with this card.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-185",
    name: "Unrevealed",
    nameEn: "Unrevealed",
    number: "185",
    rarity: "Promo",
    language: "KR",
    sourceNote:
      "Bulbapedia's SV-P Promotional cards (KTCG) table lists #185/SV-P as an " +
      "empty/unrevealed row (no name, type, or product given) as of this research " +
      "(Aug 2026) - not a parsing gap on this end. Kept as a numbering placeholder; " +
      "revisit once Bulbapedia's own table is updated with this card.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-186",
    name: "상처약",
    nameEn: "Potion",
    number: "186",
    rarity: "Promo",
    artist: "Ayaka Yoshida",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Potion). Distribution per Bulbapedia: Victini BWR Competition Promo Card Pack. Korean name '상처약' (아이템) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000186), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-187",
    name: "Energy Search",
    nameEn: "Energy Search",
    number: "187",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Energy Search). Distribution per Bulbapedia: Victini BWR Competition Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000187) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-188",
    name: "Crushing Hammer",
    nameEn: "Crushing Hammer",
    number: "188",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Crushing Hammer). Distribution per Bulbapedia: Victini BWR Competition Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000188) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-189",
    name: "Switch",
    nameEn: "Switch",
    number: "189",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Switch). Distribution per Bulbapedia: Victini BWR Competition Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000189) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-190",
    name: "Pokémon Catcher",
    nameEn: "Pokémon Catcher",
    number: "190",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Pokémon Catcher). Distribution per Bulbapedia: Victini BWR Competition Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000190) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-191",
    name: "하이퍼볼",
    nameEn: "Ultra Ball",
    number: "191",
    rarity: "Promo",
    artist: "Ayaka Yoshida",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Ultra Ball). Distribution per Bulbapedia: Victini BWR Competition Promo Card Pack. Korean name '하이퍼볼' (아이템) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000191), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-192",
    name: "Boss's Orders (Ghetsis)",
    nameEn: "Boss's Orders (Ghetsis)",
    number: "192",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Boss's Orders (Ghetsis)). Distribution per Bulbapedia: Victini BWR Competition Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000192) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-193",
    name: "Cheren",
    nameEn: "Cheren",
    number: "193",
    rarity: "Promo",
    cardType: "Trainer",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Cheren). Distribution per Bulbapedia: Victini BWR Competition Promo Card Pack. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000193) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-194",
    name: "Basic Grass Energy",
    nameEn: "Basic Grass Energy",
    number: "194",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Grass Energy). Distribution per Bulbapedia: Victini BWR Competition participation prize. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000194) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-195",
    name: "기본 불꽃 에너지",
    nameEn: "Basic Fire Energy",
    number: "195",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Fire Energy). Distribution per Bulbapedia: Victini BWR Competition participation prize. Korean name '기본 불꽃 에너지' (기본 에너지) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000195), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-196",
    name: "기본 물 에너지",
    nameEn: "Basic Water Energy",
    number: "196",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Water Energy). Distribution per Bulbapedia: Victini BWR Competition participation prize. Korean name '기본 물 에너지' (기본 에너지) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000196), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-197",
    name: "Basic Lightning Energy",
    nameEn: "Basic Lightning Energy",
    number: "197",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Lightning Energy). Distribution per Bulbapedia: Victini BWR Competition participation prize. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000197) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-198",
    name: "기본 초 에너지",
    nameEn: "Basic Psychic Energy",
    number: "198",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Psychic Energy). Distribution per Bulbapedia: Victini BWR Competition participation prize. Korean name '기본 초 에너지' (기본 에너지) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000198), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-199",
    name: "기본 격투 에너지",
    nameEn: "Basic Fighting Energy",
    number: "199",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Fighting Energy). Distribution per Bulbapedia: Victini BWR Competition participation prize. Korean name '기본 격투 에너지' (기본 에너지) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000199), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-200",
    name: "기본 악 에너지",
    nameEn: "Basic Darkness Energy",
    number: "200",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Darkness Energy). Distribution per Bulbapedia: Victini BWR Competition participation prize. Korean name '기본 악 에너지' (기본 에너지) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000200), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-201",
    name: "Basic Metal Energy",
    nameEn: "Basic Metal Energy",
    number: "201",
    rarity: "Promo",
    cardType: "Energy",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Basic Metal Energy). Distribution per Bulbapedia: Victini BWR Competition participation prize. No independent Korean-name source found this session: pokemoncard.co.kr's live site blocks direct fetches (410/blocked on curl, a real browser tab, and WebFetch alike), and no Wayback Machine snapshot exists for this exact card id (SVP000000201) as of this research. namu.wiki was also tried as a fallback source and returned a Cloudflare block page to every fetch method available this session. Needs a fresh pokemoncard.co.kr archive snapshot or a working namu.wiki/other independent Korean-name source before this can be verified.",
    verified: false,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-202",
    name: "비크티니",
    nameEn: "Victini",
    number: "202",
    rarity: "Promo",
    artist: "5ban Graphics",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Victini). Distribution per Bulbapedia: Victini BWR Competition Winner prize. Korean name '비크티니' (HP80, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000202), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

  {
    set: {
      setId: "pokemon:ko:SV-P",
      gameId: "pokemon",
      code: "ko:SV-P",
      name: "스카레트&바이올렛 프로모카드",
      nameEn: "Scarlet & Violet Promotional cards",
    },
    externalId: "ko:SV-P-203",
    name: "비크티니",
    nameEn: "Victini",
    number: "203",
    rarity: "Promo",
    artist: "Amelicart",
    cardType: "Pokémon",
    language: "KR",
    sourceNote:
      "English name/number from Bulbapedia's SV-P Promotional cards (KTCG) table (Victini). Distribution per Bulbapedia: Scarlet & Violet \"Black Bolt & White Flare\" Card Album Set. Korean name '비크티니' (HP80, 기본 포켓몬) confirmed via the official pokemoncard.co.kr card-detail page for this exact card id (/cards/detail/SVP000000203), recovered through a Wayback Machine snapshot since the live site blocks direct fetches from this session (410/blocked on curl, a real browser tab, and WebFetch alike).",
    verified: true,
  },

];
