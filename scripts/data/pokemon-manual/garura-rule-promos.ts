import type { ManualCatalogItemEntry } from "./types";

/**
 * A small lineage of Japanese "alternate battle rule" Trainer cards, each
 * mandatory-play for its own special tag-team format and distributed only
 * at the tournament/campaign that introduced that rule — never sold in a
 * booster product, so tcgdex.net has no data for any of them (no set to
 * even probe: these predate tcgdex's JP coverage, which starts at ADV1).
 *
 * NOT part of the 2023 "Pokémon Card Game Classic" retail box, despite a
 * superficial resemblance (gold-marbled border) that prompted the initial
 * lookup — the official 2023 Classic product page describes only three
 * 60-card decks, no rule-variant inserts, and no source connects any of
 * these four cards to that product. They span 1998-2007 instead:
 *
 *  - タッチ交代！ (Touch Change!) - 1998, "ガルーラルール" (Garura Rules).
 *  - タッチ世代交代！ (Touch Generation Change!) - 2002, "New Garura Rules".
 *  - タッチ交換！ (Touch Exchange!) - 2006, "Tag Battle Rules", 130/PCG-P.
 *  - タッチ交換！ (2007 Gen IV art reprint) - same rule, unnumbered.
 *
 * First three cross-corroborated (Aug 2026) against 2+ independent sources
 * each (Bulbapedia + a JP retail/price-tracking listing citing the same
 * event/number). The 2007 reprint has only Bulbapedia as a source so far
 * and stays an unverified stub rather than being guessed into existence.
 */
export const POKEMON_MANUAL_ENTRIES: ManualCatalogItemEntry[] = [
  {
    set: {
      setId: "pokemon:ja:GARURA-RULE-PROMO",
      gameId: "pokemon",
      code: "ja:GARURA-RULE-PROMO",
      name: "ルール専用プロモカード（ガルーラルール・タッグバトルルール）",
      nameEn: "Rule-Exclusive Promo Cards (Garura Rules / Tag Battle Rules)",
    },
    externalId: "ja:GARURA-RULE-PROMO-touch-change",
    name: "タッチ交代！",
    nameEn: "Touch Change!",
    rarity: "Promo",
    artist: "Nobuyuki Habu",
    cardType: "Trainer",
    language: "JP",
    sourceNote:
      "No tcgdex set exists to even probe an id against (tcgdex's JP coverage starts at ADV1, " +
      "well after 1998). Distributed at the 'ガルーラ親子大会' (Garura Parent/Child Tournament), " +
      "May 1998, and reprinted as an insert in Pokémon Card Fan Club Vol. 5 (June 1998) - " +
      "mandatory-play card for the 'ガルーラルール' (Garura Rules) tag-team format. Confirmed via " +
      "Bulbapedia's dedicated page ('Touch Change! (Garura Parent/Child promo)') plus an " +
      "independent JP retail listing (enndalbuy2.com) citing the same Fan Club Vol. 5 insert " +
      "detail.",
    verified: true,
  },
  {
    set: {
      setId: "pokemon:ja:GARURA-RULE-PROMO",
      gameId: "pokemon",
      code: "ja:GARURA-RULE-PROMO",
      name: "ルール専用プロモカード（ガルーラルール・タッグバトルルール）",
      nameEn: "Rule-Exclusive Promo Cards (Garura Rules / Tag Battle Rules)",
    },
    externalId: "ja:GARURA-RULE-PROMO-027p",
    name: "タッチ世代交代！",
    nameEn: "Touch Generation Change!",
    number: "027/P",
    rarity: "Promo",
    artist: "Tomokazu Komiya",
    cardType: "Trainer",
    language: "JP",
    sourceNote:
      "Distributed at the 2002 New Garura Parent/Child Tournament ('New Garura Rules' format), " +
      "number 027/P. Corroborated by Bulbapedia and pokumon.com both citing the same event and " +
      "number. NOTE: one search result described a possibly-separate unnumbered 2002 New Garura " +
      "printing distinct from 027/P, while another treated 027/P as that same 2002 printing - " +
      "this ambiguity was not resolved this session (no 5th/duplicate row was added to guess at " +
      "it). Re-check Bulbapedia's page directly before relying on this entry for anything beyond " +
      "cataloguing.",
    verified: true,
  },
  {
    set: {
      setId: "pokemon:ja:GARURA-RULE-PROMO",
      gameId: "pokemon",
      code: "ja:GARURA-RULE-PROMO",
      name: "ルール専用プロモカード（ガルーラルール・タッグバトルルール）",
      nameEn: "Rule-Exclusive Promo Cards (Garura Rules / Tag Battle Rules)",
    },
    externalId: "ja:GARURA-RULE-PROMO-130pcgp",
    name: "タッチ交換！",
    nameEn: "Touch Exchange!",
    number: "130/PCG-P",
    rarity: "Promo",
    artist: "Sumiyoshi Kizuki",
    cardType: "Trainer",
    language: "JP",
    sourceNote:
      "Distributed at Battle Road Spring 2006 (Plusle/Minun Tag Battle), 'Tag Battle Rules' " +
      "format, number 130/PCG-P. Corroborated by Bulbapedia ('Touch Exchange! (PCG-P Promo 130)') " +
      "and independently by premium.gamepedia.jp's JP price-tracker citing the identical code " +
      "'その他-130/PCG-P'.",
    verified: true,
  },
  {
    set: {
      setId: "pokemon:ja:GARURA-RULE-PROMO",
      gameId: "pokemon",
      code: "ja:GARURA-RULE-PROMO",
      name: "ルール専用プロモカード（ガルーラルール・タッグバトルルール）",
      nameEn: "Rule-Exclusive Promo Cards (Garura Rules / Tag Battle Rules)",
    },
    externalId: "ja:GARURA-RULE-PROMO-touch-exchange-2007",
    name: "タッチ交換！",
    nameEn: "Touch Exchange! (2007 reprint)",
    rarity: "Promo",
    cardType: "Trainer",
    language: "JP",
    sourceNote:
      "Same 'Tag Battle Rules' effect as 130/PCG-P, reprinted with Gen IV-style art for Battle " +
      "Road Summer 2007 (DP Tag Battle), unnumbered. Only one source found this session " +
      "(Bulbapedia) - not independently corroborated, so left as an unverified stub rather than " +
      "seeded. Needs a second corroborating source (a JP retail/price-tracking listing, same " +
      "pattern as the other three entries in this file) before flipping to verified.",
    verified: false,
  },
];
