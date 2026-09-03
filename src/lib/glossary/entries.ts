import { CARD_CONDITION_LABELS, type RawCardCondition } from "@/lib/constants";

/**
 * The hobby's vocabulary, as data rather than JSX, so a term can be added
 * or reworded without touching layout — and so the same entries could later
 * feed a tooltip or a search result without a second copy of the text.
 */
export const GLOSSARY_CATEGORIES = [
  "Condition & Grading",
  "Rarity & Card Types",
  "Sets & Printing",
  "Buying, Selling & Trading",
  "Protecting & Storing",
  "Community Slang",
] as const;

export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];

export interface GlossaryEntry {
  /** Anchor id — every term is deep-linkable, e.g. /glossary#slab. */
  slug: string;
  term: string;
  /** The short form people actually say out loud, when there is one. */
  abbr?: string;
  /** Other names for the same thing, matched by search but not displayed. */
  aka?: string[];
  category: GlossaryCategory;
  definition: string;
}

/**
 * The five raw conditions, in the order CARD_CONDITIONS declares them
 * (best to worst). Kept separate from GLOSSARY_ENTRIES below because the
 * Card Condition overview renders them as a table with each condition's
 * percentage beside it, and because that section is the deep-link target
 * from the Shortlist and must never be filtered away by a search.
 */
export const CARD_CONDITION_DESCRIPTIONS: Record<RawCardCondition, string> = {
  NM: "The card looks almost brand new or pack-fresh, with only tiny, minor flaws like a tiny speck of edge whitening.",
  LP: "The card shows minor signs of wear, such as slight edge scuffing or small light scratches.",
  MP: "The card has clear, noticeable wear like heavier border whitening, scratching, or mild scuffs.",
  HP: "The card has serious damage like heavy creasing, deep scratches, bends, or major whitening.",
  DMG: "The card is severely compromised with tears, heavy water damage, bends, or missing pieces, making it unplayable even inside a protective sleeve.",
};

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  // ── Condition & Grading ──────────────────────────────────────────────
  {
    slug: "raw",
    term: "Raw",
    category: "Condition & Grading",
    definition:
      "An ungraded card — one that hasn't been sent to a grading company and isn't sealed in a plastic case. Most cards in a shop's display case are raw.",
  },
  {
    slug: "graded",
    term: "Graded",
    category: "Condition & Grading",
    definition:
      "A card that has been sent to a third-party company, assessed for condition, given a numeric grade, and sealed in a tamper-evident case.",
  },
  {
    slug: "slab",
    term: "Slab",
    aka: ["case", "encapsulated"],
    category: "Condition & Grading",
    definition:
      "The sealed plastic case a graded card comes back in, with the grade printed on a label at the top. Opening it (\"cracking\") voids the grade.",
  },
  {
    slug: "grading-companies",
    term: "PSA, BGS, CGC",
    category: "Condition & Grading",
    definition:
      "The three grading companies you'll see most often. Each has its own scale and label design, and the same card can be worth noticeably different amounts depending on who graded it.",
  },
  {
    slug: "pop-report",
    term: "Population report",
    abbr: "Pop report",
    category: "Condition & Grading",
    definition:
      "A grading company's public count of how many copies of a card it has graded at each grade. A low population at the top grade is part of what makes those copies scarce.",
  },
  {
    slug: "centering",
    term: "Centering",
    category: "Condition & Grading",
    definition:
      "How evenly the card's border is distributed around the artwork. Off-centre cards are a printing artefact, not damage, but they cap how high a card can grade.",
  },
  {
    slug: "whitening",
    term: "Whitening",
    aka: ["edge wear", "border whitening"],
    category: "Condition & Grading",
    definition:
      "Pale flecks along the edges or corners where the coloured surface layer has worn through to the white card stock underneath. The most common form of wear on a played card.",
  },
  {
    slug: "surface",
    term: "Surface",
    category: "Condition & Grading",
    definition:
      "The front and back faces of a card, and one of the things condition is judged on — scratches, print lines, dimples and clouding all live here.",
  },

  // ── Rarity & Card Types ─────────────────────────────────────────────
  {
    slug: "holo",
    term: "Holo",
    aka: ["holographic", "foil"],
    category: "Rarity & Card Types",
    definition:
      "A card with a reflective, shimmering finish. On most Pokémon cards the holo pattern covers the artwork window only.",
  },
  {
    slug: "reverse-holo",
    term: "Reverse holo",
    category: "Rarity & Card Types",
    definition:
      "The inverse of a normal holo: the card's body shimmers while the artwork window stays matte. Usually a parallel printing of an otherwise common card.",
  },
  {
    slug: "full-art",
    term: "Full art",
    category: "Rarity & Card Types",
    definition:
      "A card whose artwork extends across the entire face rather than sitting in a window, typically at a higher rarity than the standard version of the same card.",
  },
  {
    slug: "alt-art",
    term: "Alternate art",
    abbr: "Alt art",
    category: "Rarity & Card Types",
    definition:
      "A different illustration of a card that also exists in a standard printing. Alt arts are usually the most sought-after cards in a set.",
  },
  {
    slug: "secret-rare",
    term: "Secret rare",
    category: "Rarity & Card Types",
    definition:
      "A card numbered beyond the set's stated size — 198/195, for instance — and printed at a lower rate than the cards inside that count.",
  },
  {
    slug: "parallel",
    term: "Parallel",
    category: "Rarity & Card Types",
    definition:
      "An alternative printing of a card that already exists in the set, distinguished by a different finish, border colour or foil pattern. Common in sports card products.",
  },
  {
    slug: "numbered",
    term: "Numbered",
    aka: ["serial numbered", "short print"],
    category: "Rarity & Card Types",
    definition:
      "A card stamped with its position in a limited print run, written as 12/99. The lower the second number, the fewer exist.",
  },
  {
    slug: "chase-card",
    term: "Chase card",
    category: "Rarity & Card Types",
    definition:
      "The card from a set that most people opening it are hoping to find, and usually the one carrying most of the set's value.",
  },
  {
    slug: "error-card",
    term: "Error card",
    aka: ["miscut", "misprint"],
    category: "Rarity & Card Types",
    definition:
      "A card that left the factory wrong — miscut, missing a foil layer, printed off-register. Some errors are collectible in their own right; most just grade poorly.",
  },

  // ── Sets & Printing ─────────────────────────────────────────────────
  {
    slug: "first-edition",
    term: "1st Edition",
    category: "Sets & Printing",
    definition:
      "A card from a set's initial print run, marked with a stamp on the card face. Later runs of the same card have no stamp and are usually worth less.",
  },
  {
    slug: "promo",
    term: "Promo",
    category: "Sets & Printing",
    definition:
      "A card distributed outside normal booster packs — in a tin, at an event, with a magazine — rather than pulled from a set's regular print run.",
  },
  {
    slug: "booster-box",
    term: "Booster box",
    category: "Sets & Printing",
    definition:
      "A sealed box containing a fixed number of booster packs from one set.",
  },
  {
    slug: "etb",
    term: "Elite Trainer Box",
    abbr: "ETB",
    category: "Sets & Printing",
    definition:
      "A Pokémon product containing several booster packs plus accessories like sleeves, dice and a storage box.",
  },
  {
    slug: "bundle",
    term: "Bundle",
    category: "Sets & Printing",
    definition:
      "A smaller sealed product than a booster box — typically a handful of packs with a promo card or accessory.",
  },
  {
    slug: "sealed",
    term: "Sealed",
    category: "Sets & Printing",
    definition:
      "Any product still in its factory wrapping and never opened. Collected and traded as its own category, separately from singles.",
  },
  {
    slug: "pull-rate",
    term: "Pull rate",
    category: "Sets & Printing",
    definition:
      "How often a particular card or rarity appears when opening packs of a set — roughly one in so many packs.",
  },

  // ── Buying, Selling & Trading ───────────────────────────────────────
  {
    slug: "singles",
    term: "Singles",
    category: "Buying, Selling & Trading",
    definition:
      "Individual cards bought one at a time, as opposed to sealed product. Buying the single card you want is almost always cheaper than opening packs until you find it.",
  },
  {
    slug: "market-price",
    term: "Market price",
    category: "Buying, Selling & Trading",
    definition:
      "A card's going rate, based on what copies have recently sold for. Quoted for a Near Mint copy, which is why a played card is worth a percentage of it — see Card Condition above.",
  },
  {
    slug: "comps",
    term: "Comps",
    aka: ["comparables", "sold listings"],
    category: "Buying, Selling & Trading",
    definition:
      "Recent completed sales of the same card, used to work out what it's actually worth. Asking prices aren't comps — only what someone paid.",
  },
  {
    slug: "bulk",
    term: "Bulk",
    category: "Buying, Selling & Trading",
    definition:
      "Low-value commons and uncommons, priced by the hundred or the kilo rather than individually.",
  },
  {
    slug: "lgs",
    term: "Local Game Store",
    abbr: "LGS",
    category: "Buying, Selling & Trading",
    definition:
      "The bricks-and-mortar shop you buy from and play at. The place the In-Store Shortlist is built for.",
  },
  {
    slug: "wtb-wts-wtt",
    term: "WTB / WTS / WTT",
    category: "Buying, Selling & Trading",
    definition:
      "Want To Buy, Want To Sell, Want To Trade — the shorthand that opens most posts in trading groups.",
  },

  // ── Protecting & Storing ────────────────────────────────────────────
  {
    slug: "penny-sleeve",
    term: "Penny sleeve",
    category: "Protecting & Storing",
    definition:
      "A thin, soft plastic sleeve that goes on a card first, before anything rigid. Named for costing about a cent each.",
  },
  {
    slug: "toploader",
    term: "Toploader",
    category: "Protecting & Storing",
    definition:
      "A rigid plastic holder a sleeved card slides into, used to protect it in storage or in the post.",
  },
  {
    slug: "binder",
    term: "Binder",
    category: "Protecting & Storing",
    definition:
      "A folder of pocketed pages for displaying a collection. Side-loading pockets are preferred, since cards can't fall out of them.",
  },

  // ── Community Slang ─────────────────────────────────────────────────
  {
    slug: "pc",
    term: "Personal Collection",
    abbr: "PC",
    category: "Community Slang",
    definition:
      "The cards someone keeps rather than sells — often built around one Pokémon, player or artist. Also what this app calls your collection.",
  },
  {
    slug: "hit",
    term: "Hit",
    category: "Community Slang",
    definition:
      "A valuable card pulled from a pack. \"Did you get any hits?\" means \"did anything good come out of that box?\"",
  },
  {
    slug: "ripping",
    term: "Ripping",
    aka: ["opening", "breaking"],
    category: "Community Slang",
    definition:
      "Opening sealed product. Doing it destroys the sealed product's value, so it's a deliberate choice rather than an obvious one.",
  },
  {
    slug: "grail",
    term: "Grail",
    category: "Community Slang",
    definition:
      "The one card a collector most wants and usually can't yet afford — the end goal of a collection rather than an item on a shopping list.",
  },
];

/** Full name plus code, e.g. "Near Mint (NM)" — used by the condition table. */
export function conditionHeading(condition: RawCardCondition): string {
  return `${CARD_CONDITION_LABELS[condition]} (${condition})`;
}
