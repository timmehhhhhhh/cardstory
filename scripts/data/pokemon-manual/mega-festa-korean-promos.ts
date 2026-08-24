import type { ManualCatalogItemEntry } from "./types";

/**
 * Korean "M-P" promotional cards — a distinct promo line from the "SV-P"
 * numbering in sv-p-korean-promos.ts, tied to Pokémon Korea's 2026 "Mega
 * Festa" event (Seongsu-dong / Seoul Forest, May 1-31 2026, part of the
 * franchise's 30th-anniversary celebrations). Like the SV-P line, tcgdex.net
 * has no Korean promo-set data at all, so this is hand-researched.
 *
 * Only one card catalogued so far — the event's headline Magikarp promo,
 * numbered 040/M-P, which implies at least 39 earlier M-P cards exist from
 * prior Korean promo lines/events not yet researched. Sourced Aug 2026 (the
 * card itself is barely 3 months old at time of writing) from Bulbapedia's
 * dedicated page ("Magikarp (M-P Promo 40)"), corroborated by contemporary
 * marketplace/retailer listings (eBay, StockX, Sawadeekard, Uturi Trading,
 * KrystalKollectz) all citing the identical card number, HP, and Mega Festa
 * 2026 branding.
 */
export const POKEMON_MANUAL_ENTRIES: ManualCatalogItemEntry[] = [
  {
    set: {
      setId: "pokemon:ko:M-P",
      gameId: "pokemon",
      code: "ko:M-P",
      name: "메가 페스타 프로모카드",
      nameEn: "Mega Festa Promotional cards",
    },
    externalId: "ko:M-P-040",
    name: "잉어킹",
    nameEn: "Magikarp",
    number: "040",
    rarity: "Promo",
    artist: "The Pokémon Company",
    cardType: "Pokémon",
    imageSmallUrl: "https://archives.bulbagarden.net/media/upload/thumb/9/98/MagikarpMPromo40.jpg/250px-MagikarpMPromo40.jpg",
    imageLargeUrl: "https://archives.bulbagarden.net/media/upload/9/98/MagikarpMPromo40.jpg",
    language: "KR",
    sourceNote:
      "Distributed at 'Pokémon Mega Festa 2026' (Seongsu-dong/Seoul Forest, Seoul, " +
      "May 1-31 2026) via a Pokémon GO stamp-rally giveaway — the on-site giveaway was " +
      "suspended on its opening day after crowds of an estimated 40,000 overwhelmed the " +
      "venue, and distribution was later reorganized through a Pokémon Run Challenge " +
      "collectible from July 7 at 520 SKT T World stores. Korean name '잉어킹' and card " +
      "number '040/M-P' confirmed via Bulbapedia's dedicated page ('Magikarp (M-P Promo " +
      "40)') plus independent corroboration from multiple contemporaneous marketplace " +
      "listings (eBay, StockX, Sawadeekard, Uturi Trading, KrystalKollectz) all citing " +
      "the same number and event branding. Image hotlinked from Bulbagarden Archives — " +
      "no official-publisher CDN page was reachable this session for a card barely three " +
      "months old, so this is a deliberate exception to the 'official CDN only' rule; the " +
      "scan was viewed directly and matches this entry exactly (잉어킹, HP30, 040/M-P, " +
      "'MEGA FESTA 2026' branding).",
    verified: true,
  },
];
