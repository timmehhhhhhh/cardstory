import type { CardImageFile } from "./types";

/**
 * Images for the 14 Flesh and Blood promo/LGS printings that came back from
 * api.goagain.dev with image_url: null (see lib/games/fab/mapper.ts).
 *
 * These are NOT scraped. Every URL below is the provider's own image for a
 * *different printing of the same card* — the promo printing has no art on
 * file, but the card does, and it's served from the same hosts as the 1,288
 * FAB images we already store. Each entry records which printing it came from
 * so the substitution is auditable; where a card has both a standard and an
 * extended/alternate-art printing, the standard one is preferred so the tile
 * shows the card's normal artwork.
 *
 * Two of the fourteen are deliberately absent and still render the CardImage
 * placeholder, because guessing would be worse than a blank:
 *   - Gesture of Goodwill (LGS361): no printing of this card has an image in the provider's data.
 *   - Frankie, Make Ends Meat (LSS021): the provider's only printing URL (LSS021.webp) returns 403 — the S3 object is not public.
 *
 * Re-checkable: every URL was fetched and confirmed to return an image at the
 * time of writing; scripts/check-card-images.ts re-verifies them later.
 */
export const FAB_PROMO_IMAGES: CardImageFile = {
  gameId: "fab",
  sourceNote:
    "Flesh and Blood promo images sourced from api.goagain.dev — the same provider that " +
    "supplies the rest of the FAB catalog — using a sibling printing of the same card, " +
    "because the promo printing itself has no image on file. See each entry's sourceUrl.",
  verified: true,
  generatedAt: "2026-08-18T00:00:00.000Z",
  entries: [
    {
      // Zen State (FAB244) — art taken from printing 1HP137.
      externalId: "QMNGQGjdzzDNWmwJ7hGzc",
      imageSmallUrl: "https://storage.googleapis.com/fabmaster/media/images/1HP137.width-450.png",
      imageLargeUrl: "https://storage.googleapis.com/fabmaster/media/images/1HP137.width-450.png",
      sourceUrl: "https://api.goagain.dev/v1/sets/fab",
      sourceName: "Zen State",
    },
    {
      // Renounce Grandeur (FAB330) — art taken from printing MPG034.
      externalId: "RcmWmfcbfPhQLnTg8hb8c",
      imageSmallUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/MPG034.webp",
      imageLargeUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/MPG034.webp",
      sourceUrl: "https://api.goagain.dev/v1/sets/fab",
      sourceName: "Renounce Grandeur",
    },
    {
      // Romping Club (FAB399) — art taken from printing 1HP006.
      externalId: "FBWCGL7ttQmzcWcrcRq9g",
      imageSmallUrl: "https://storage.googleapis.com/fabmaster/media/images/1HP006.width-450.png",
      imageLargeUrl: "https://storage.googleapis.com/fabmaster/media/images/1HP006.width-450.png",
      sourceUrl: "https://api.goagain.dev/v1/sets/fab",
      sourceName: "Romping Club",
    },
    {
      // Valda, Seismic Impact (HER135) — art taken from printing MPG001.
      externalId: "F9ff7RBhfFdQqkF7dKCKC",
      imageSmallUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/MPG001.webp",
      imageLargeUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/MPG001.webp",
      sourceUrl: "https://api.goagain.dev/v1/sets/her",
      sourceName: "Valda, Seismic Impact",
    },
    {
      // Rhinar, Reckless Rampage (HER159) — art taken from printing 1HP001.
      externalId: "dzdcLtGBjBGbhQhgftQqK",
      imageSmallUrl: "https://storage.googleapis.com/fabmaster/media/images/1HP001.width-450.png",
      imageLargeUrl: "https://storage.googleapis.com/fabmaster/media/images/1HP001.width-450.png",
      sourceUrl: "https://api.goagain.dev/v1/sets/her",
      sourceName: "Rhinar, Reckless Rampage",
    },
    {
      // Numbskull Charm (LGS422) — art taken from printing SUP007.
      externalId: "RqtwrKcHQm6Q9MWqLcprq",
      imageSmallUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/SUP007.webp",
      imageLargeUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/SUP007.webp",
      sourceUrl: "https://api.goagain.dev/v1/sets/lgs",
      sourceName: "Numbskull Charm",
    },
    {
      // Thespian Charm (LGS423) — art taken from printing APS014.
      externalId: "wLKmjz6K8BwbGtqmMkThm",
      imageSmallUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/APS014.webp",
      imageLargeUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/APS014.webp",
      sourceUrl: "https://api.goagain.dev/v1/sets/lgs",
      sourceName: "Thespian Charm",
    },
    {
      // Cheater's Charm (LGS424) — art taken from printing SUP068.
      externalId: "8GFHbhmr6pN9FKgNbHq7P",
      imageSmallUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/SUP068.webp",
      imageLargeUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/SUP068.webp",
      sourceUrl: "https://api.goagain.dev/v1/sets/lgs",
      sourceName: "Cheater's Charm",
    },
    {
      // Liar's Charm (LGS425) — art taken from printing SUP076.
      externalId: "NcrWQ9CBFTKGMwLtBCcLD",
      imageSmallUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/SUP076.webp",
      imageLargeUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/SUP076.webp",
      sourceUrl: "https://api.goagain.dev/v1/sets/lgs",
      sourceName: "Liar's Charm",
    },
    {
      // Ghost Protocol: Mainframe (LGS443) — art taken from printing PEN063.
      externalId: "7TgHwqHwwLNLChB8NT7dW",
      imageSmallUrl: "https://legendstory-production-s3-public.s3.amazonaws.com/media/cards/large/PEN063.webp",
      imageLargeUrl: "https://legendstory-production-s3-public.s3.amazonaws.com/media/cards/large/PEN063.webp",
      sourceUrl: "https://api.goagain.dev/v1/sets/lgs",
      sourceName: "Ghost Protocol: Mainframe",
    },
    {
      // Ghost Protocol: Architect (LGS444) — art taken from printing PEN062.
      externalId: "cGWcP7trwttKRjdHkkqnr",
      imageSmallUrl: "https://legendstory-production-s3-public.s3.amazonaws.com/media/cards/large/PEN062.webp",
      imageLargeUrl: "https://legendstory-production-s3-public.s3.amazonaws.com/media/cards/large/PEN062.webp",
      sourceUrl: "https://api.goagain.dev/v1/sets/lgs",
      sourceName: "Ghost Protocol: Architect",
    },
    {
      // Bittering Thorns (LGS445) — art taken from printing ASR007.
      externalId: "Qj9nLNK6cDcKPWdDbkDMn",
      imageSmallUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/ASR007.webp",
      imageLargeUrl: "https://d2wlb52bya4y8z.cloudfront.net/media/cards/large/ASR007.webp",
      sourceUrl: "https://api.goagain.dev/v1/sets/lgs",
      sourceName: "Bittering Thorns",
    },
  ],
};
