import type { ManualCatalogItemEntry } from "./types";

/**
 * "アルフの石版" (Alph Lithograph) — a family of 4 secret-rare, Unown-cipher
 * "look at your opponent's hand" Trainer inserts bundled in Japan's 2010
 * "LEGEND" series booster boxes. tcgdex.net's Japanese data is missing all
 * 4 (each JP LEGEND set shows cardCount.official === cardCount.total, no
 * headroom for a secret card, and a direct id probe 404s), even though
 * tcgdex's English mirrors of the same sets DO carry their English
 * counterparts (e.g. hgss1-ONE, set hgss1 official=123/total=124 — the +1
 * *is* this secret card). This was a one-off 2010 promotional mechanic
 * never repeated in a later era, so it doesn't recur elsewhere in the
 * catalog. A 5th JP LEGEND-era set (LL, "強化パック ロストリンク") was
 * checked and confirmed to have no Alph Lithograph — Bulbapedia's
 * disambiguation page is exhaustive at exactly these 4 variants. None of
 * these 4 have a Chinese/Korean counterpart to backfill either: tcgdex's
 * zh-cn/zh-tw/ko data has zero sets from the 2009-2010 LEGEND era at all
 * (those localizations start years later, at Sun & Moon / Sword & Shield).
 *
 * Card numbers cross-corroborated (Aug 2026) against multiple independent
 * Japanese marketplace/retail listings (snkrdunk, netoff, cardrush,
 * hareruya2, physiodemy, furu1, mercari) plus Bulbapedia's disambiguation
 * page and tcgdex's English mirror data — not a single unverified source.
 * Illustrator (Milky Isobe) and rarity ("Rare Secret") are confirmed for
 * the family via the English mirrors. imageSmallUrl/imageLargeUrl are left
 * unset: these LEGEND-era JP printings predate the id space of the official
 * pokemon-card.com card search, so the image backfill in
 * scripts/crawl-pokemon-ja-images.ts cannot reach them either, and a retail
 * listing photo isn't an acceptable substitute for a reference scan. They
 * render via the CardImage fallback (components/cards/card-image.tsx).
 */
export const POKEMON_MANUAL_ENTRIES: ManualCatalogItemEntry[] = [
  {
    set: {
      setId: "pokemon:ja:L1a",
      gameId: "pokemon",
      code: "ja:L1a",
      name: "ハートゴールドコレクション",
      nameEn: "HeartGold Collection",
    },
    externalId: "ja:L1a-071",
    name: "アルフの石版",
    nameEn: "Alph Lithograph",
    number: "071/070",
    rarity: "Rare Secret",
    artist: "Milky Isobe",
    language: "JP",
    sourceNote:
      "tcgdex has no data for this card (404 on GET /v2/ja/cards/L1a-071; set L1a reports " +
      "official=total=70, no headroom for the real 71st secret card). Corroborated by JP " +
      "retail listings (cardrush, hareruya2, cardshop-serra, c-labo-online, realize-tcg) all " +
      "citing '071/070'. English sibling confirmed via tcgdex: hgss1-ONE 'Alph Lithograph', " +
      "rarity Secret, illustrator Milky Isobe — set hgss1 official=123/total=124.",
    verified: true,
  },
  {
    set: {
      setId: "pokemon:ja:L1b",
      gameId: "pokemon",
      code: "ja:L1b",
      name: "ソウルシルバーコレクション",
      nameEn: "SoulSilver Collection",
    },
    externalId: "ja:L1b-071",
    name: "アルフの石版",
    nameEn: "Alph Lithograph",
    number: "071/070",
    rarity: "Rare Secret",
    artist: "Milky Isobe",
    language: "JP",
    sourceNote:
      "Same gap signature as L1a (tcgdex set L1b reports official=total=70). Corroborated by " +
      "JP retail listings (cardrush, fril, magi, mercari, hareruya2) citing '071/070'. English " +
      "counterpart is the same hgss1-ONE — JP split the HeartGold & SoulSilver release into two " +
      "separate 70-card sets (HeartGold / SoulSilver Collections) that the EN release merged into one.",
    verified: true,
  },
  {
    set: {
      setId: "pokemon:ja:L2",
      gameId: "pokemon",
      code: "ja:L2",
      name: "よみがえる伝説",
      nameEn: "The Legend Revived",
    },
    externalId: "ja:L2-081",
    name: "アルフの石版",
    nameEn: "Alph Lithograph",
    number: "081/080",
    rarity: "Rare Secret",
    artist: "Milky Isobe",
    language: "JP",
    sourceNote:
      "tcgdex set L2 reports official=total=70 (no per-card entry found for a secret beyond " +
      "that). Corroborated by multiple independent JP retail listings (snkrdunk, physiodemy) " +
      "both citing 'L2 081/080'. English counterpart per Bulbapedia: Undaunted THREE.",
    verified: true,
  },
  {
    set: {
      setId: "pokemon:ja:L3",
      gameId: "pokemon",
      code: "ja:L3",
      name: "頂上大激突",
      nameEn: "Clash at the Summit",
    },
    externalId: "ja:L3-081",
    name: "アルフの石版",
    nameEn: "Alph Lithograph",
    number: "081/080",
    rarity: "Rare Secret",
    artist: "Milky Isobe",
    language: "JP",
    sourceNote:
      "tcgdex set L3 reports official=total=70 (no per-card entry found for a secret beyond " +
      "that). Corroborated by multiple independent JP retail listings (netoff, furu1) both " +
      "citing 'L3 081/080'. English counterpart per Bulbapedia: Triumphant FOUR.",
    verified: true,
  },
];
