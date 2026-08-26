import { unstable_cache } from "next/cache";
import { Prisma, type Sport } from "@prisma/client";
import { db } from "@/lib/db";
import { GAMES, WIRED_SPORTS_GAMES, getGameMeta } from "@/lib/games/registry";
import type { CuratedSetFilters } from "@/lib/curated-sets/types";
import { defaultFinishLabel } from "@/lib/games/pokemon/mapper";
import { getFinishDisplayLabel } from "@/lib/games/pokemon/finish-patterns";
import { RIFTBOUND_RARITY_ORDER } from "@/lib/games/riftbound/rarity";
import { RIFTBOUND_DOMAIN_ORDER } from "@/lib/games/riftbound/domain";
import { nameSearchVariants, normalizeForPunctuationInsensitiveMatch } from "@/lib/utils/name-match";

const WIRED_TCG_GAME_IDS = GAMES.filter((g) => g.status === "WIRED" && g.kind !== "sports").map(
  (g) => g.id
);
const WIRED_SPORT_ENUMS = WIRED_SPORTS_GAMES.map((g) => g.sport).filter(
  (s): s is Sport => s != null
);

export const CATALOG_SORTS = [
  "best_match",
  "name_asc",
  "number_asc",
  "price_desc",
  "price_asc",
  "trending_up",
  "trending_down",
  "type_asc",
  "release_desc",
  "release_asc",
  "domain_asc",
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export interface CatalogSearchParams {
  q?: string;
  gameId?: string;
  setId?: string;
  productType?: "CARD" | "SEALED";
  /**
   * Game-specific card type, e.g. Riftbound's "Champion Unit" — see
   * CatalogItem.cardType. A single value matches that value exactly (the
   * original behavior, still used by Explore's single-select sidebar); an
   * array OR's across the given values (used by Views — see
   * src/lib/views/types.ts — for e.g. "Champion Unit or Legend").
   */
  cardType?: string | string[];
  /** CatalogItem.rarity, e.g. Pokémon's "Ultra Rare" or Riftbound's "Epic". Scalar-or-array, see cardType above. */
  rarity?: string | string[];
  /** CatalogItem.language, e.g. "EN"/"JP"/"CN"/"TW"/"KR". No-op for sports rows (no language concept). Scalar-or-array, see cardType above. */
  language?: string | string[];
  /**
   * CatalogItem.variantKey — a card's priced finish, e.g. Pokémon's
   * "reverseHolofoil"/"holofoil" (see lib/games/pokemon/mapper.ts). Filters
   * on the raw provider key (the small, generic finish taxonomy), not any
   * curated collector-pattern label — so filtering "Reverse Holo" still
   * matches a set-specific name like "Cracked Ice Holo", which is only a
   * per-tile display overlay (see getFinishDisplayLabel). No-op for sports
   * rows (no finish concept — that's parallelName) and every non-Pokémon
   * game (variantKey is always "" there). Scalar-or-array, see cardType above.
   */
  variant?: string | string[];
  /**
   * Riftbound-only — CatalogItem.domain, e.g. "Fury"/"Calm" (see
   * lib/games/riftbound/domain.ts). A scalar value matches any row whose
   * domain array *contains* it (Prisma `has`, since a dual-domain Legend
   * carries two); an array OR's across values (Prisma `hasSome`), same
   * scalar-or-array convention as cardType/rarity above. No-op for every
   * other game (their `domain` column is always `[]`).
   */
  domain?: string | string[];
  /**
   * Illustrator credit — see CatalogItem.artist. Unlike cardType/rarity/
   * language, this never matches by exact equality: each value is matched
   * via a case-insensitive "contains", OR'd across every value given (so a
   * Views artist chip list like ["Yuka Morii", "Sashiko Ito"] matches
   * either). No-op/excludes sports rows (no artist column) — see
   * sportsFilterableFor below.
   */
  artist?: string | string[];
  /**
   * Card-name filter chips, OR'd together — CatalogItem.name/nameEn for TCG
   * rows, SportsCardItem.playerName for sports rows (no nameEn equivalent
   * there — sports rows have no translation concept). Unlike `q` (which
   * also matches artist/number/set), this is scoped to name only, matching
   * a "Card Name" filter label. Each chip is independently "contains"
   * (substring, with the same nameSearchVariants/punctuationInsensitiveIds
   * expansion as `q`'s name branches) or "is" (case-insensitive exact
   * match, no variant expansion). A "contains"/"is" chip always also checks
   * nameEn, so an English-name filter still matches a non-English row (e.g.
   * a JP Pokémon card) whose translation is known.
   */
  cardNames?: { mode: "is" | "contains"; value: string }[];
  /**
   * Sports cards only — restrict to rows with no parallelName (the
   * unparalleled base version of each card). No-op for TCG rows, which
   * have no parallel concept at all.
   */
  baseOnly?: boolean;
  /** Restrict results to these catalogItemIds/sportsCardItemIds (e.g. "owned" filter). */
  onlyIds?: string[];
  /** Exclude these catalogItemIds/sportsCardItemIds (e.g. "not owned" filter). */
  excludeIds?: string[];
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
  /**
   * Opt-in id of the signed-in user requesting this search. When set AND
   * every other filter above is unset/default AND sort is "best_match" (i.e.
   * this is Explore's bare, no-filters-no-search default view), searchCatalog
   * serves a randomized, per-user, 10-minute-stable feed instead of the
   * normal alphabetical listing — see getRandomExploreFeed below. Any
   * explicit filter, search text, or sort choice falls through to the usual
   * deterministic query untouched.
   */
  randomFeedUserId?: string;
}

export interface CatalogSearchItem {
  id: string;
  gameId: string;
  externalId: string;
  name: string;
  /** English translation of `name`, when known — see CatalogItem.nameEn. Null for sports rows (no language concept) and for English/untranslated cards. */
  nameEn: string | null;
  number: string | null;
  rarity: string | null;
  /** Illustrator credit, e.g. Pokémon's "Mitsuhiro Arita". Null for games/rows with no artist credit. */
  artist: string | null;
  cardType: string | null;
  /** Riftbound's domain(s) — see lib/games/riftbound/domain.ts. Always `[]` for every other game and for sports rows. */
  domain: string[];
  /** CatalogItem.language, e.g. "EN"/"JP"/"CN"/"TW"/"KR". Null for sports rows (no language concept). */
  language: string | null;
  /** CatalogItem.variantKey (the raw provider finish key, e.g. "reverseHolofoil"). Null for rows with no finish concept — every sports row, and every TCG row where variantKey is "". */
  variantKey: string | null;
  /** Fully resolved display label for variantKey — the curated collector-pattern name if one exists for this set/finish (see getFinishDisplayLabel), else the generic finish name (e.g. "Reverse Holo"). Null whenever variantKey is null. */
  variantLabel: string | null;
  imageSmallUrl: string | null;
  setName: string;
  /** English translation of setName, when known — see Set.nameEn. Null for sports rows (no language concept) and for English/untranslated sets. */
  setNameEn: string | null;
  releaseDate: string | null;
  productType: "CARD" | "SEALED";
  priceRaw: number | null;
  priceChangePct: number | null;
  hasPrice: boolean;
}

function orderBy(sort: CatalogSort): Prisma.CatalogItemOrderByWithRelationInput[] {
  switch (sort) {
    case "price_desc":
      return [{ latestPriceRaw: { sort: "desc", nulls: "last" } }, { name: "asc" }];
    case "price_asc":
      return [{ latestPriceRaw: { sort: "asc", nulls: "last" } }, { name: "asc" }];
    case "trending_up":
      return [{ priceChangePct: { sort: "desc", nulls: "last" } }];
    case "trending_down":
      return [{ priceChangePct: { sort: "asc", nulls: "last" } }];
    case "name_asc":
      return [{ name: "asc" }];
    case "type_asc":
      return [{ cardType: { sort: "asc", nulls: "last" } }, { name: "asc" }];
    case "release_desc":
      return [{ set: { releaseDate: "desc" } }, { name: "asc" }];
    case "release_asc":
      return [{ set: { releaseDate: "asc" } }, { name: "asc" }];
    case "number_asc":
      // Card numbers ("025/198", "BOL024", plain "1"/"10") need natural,
      // numeric-aware comparison that the DB can't express directly — see
      // compareCardNumbers, applied in-memory after a full fetch below.
      return [{ name: "asc" }];
    case "domain_asc":
      // Domain is a string array ranked against a static tier list
      // (RIFTBOUND_DOMAIN_ORDER) — Postgres/Prisma can't express that CASE
      // ranking as a plain orderBy, so this DB-level fallback just orders by
      // name; compareDomains applied in-memory (see runTcgQuery) does the
      // real ordering, same pattern as number_asc above.
      return [{ name: "asc" }];
    case "best_match":
    default:
      return [{ name: "asc" }];
  }
}

function sportsOrderBy(sort: CatalogSort): Prisma.SportsCardItemOrderByWithRelationInput[] {
  switch (sort) {
    case "price_desc":
      return [{ latestPriceRaw: { sort: "desc", nulls: "last" } }, { playerName: "asc" }];
    case "price_asc":
      return [{ latestPriceRaw: { sort: "asc", nulls: "last" } }, { playerName: "asc" }];
    case "trending_up":
      return [{ priceChangePct: { sort: "desc", nulls: "last" } }];
    case "trending_down":
      return [{ priceChangePct: { sort: "asc", nulls: "last" } }];
    case "type_asc":
      return [{ parallelName: { sort: "asc", nulls: "last" } }, { playerName: "asc" }];
    case "release_desc":
      return [{ releaseDate: { sort: "desc", nulls: "last" } }, { playerName: "asc" }];
    case "release_asc":
      return [{ releaseDate: { sort: "asc", nulls: "last" } }, { playerName: "asc" }];
    case "number_asc":
      // Same rationale as orderBy() above — natural sort happens in memory.
      return [{ playerName: "asc" }];
    case "name_asc":
    case "best_match":
    default:
      return [{ playerName: "asc" }];
  }
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Builds a Prisma equality-or-membership clause from a scalar-or-array
 * filter param. A bare scalar passes through unchanged, so every existing
 * single-string caller (Explore's sidebar) is byte-for-byte unaffected;
 * an array becomes `{ in: [...] }` (OR across values, used by Views — see
 * src/lib/views/types.ts), and an empty array collapses to `undefined`
 * (no filter — mirrors "all" collapsing to [] in ViewFilters).
 */
function equalsOrIn<T>(value: T | T[] | undefined): T | { in: T[] } | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return value;
  return value.length > 0 ? { in: value } : undefined;
}

/** True if a scalar-or-array filter param is actually constraining anything. */
function isFilterSet(value: unknown): boolean {
  if (value === undefined) return false;
  return Array.isArray(value) ? value.length > 0 : true;
}

/** "short_print" -> "Short Print", "Silver Prizm" -> "Silver Prizm" (idempotent). */
function titleCase(s: string | null | undefined): string | null {
  if (!s) return null;
  return s
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

type SportsRow = {
  id: string;
  year: number | null;
  distributor: string | null;
  setName: string;
  playerName: string;
  cardNumber: string | null;
  parallelName: string | null;
  cardType: string | null;
  imageUrl: string | null;
  releaseDate: Date | null;
  latestPriceRaw: Prisma.Decimal | null;
  priceChangePct: number | null;
  latestPriceDate: string | null;
};

const SPORTS_SELECT = {
  id: true,
  year: true,
  distributor: true,
  setName: true,
  playerName: true,
  cardNumber: true,
  parallelName: true,
  cardType: true,
  imageUrl: true,
  releaseDate: true,
  latestPriceRaw: true,
  priceChangePct: true,
  latestPriceDate: true,
} satisfies Prisma.SportsCardItemSelect;

/**
 * Maps a SportsCardItem row into the shared CatalogSearchItem shape used
 * throughout Explore/Sets — `id`/`externalId` stay the raw SportsCardItem
 * cuid (never collides with a CatalogItem id, which is always
 * "<gameId>:<externalId>" and therefore always contains a colon), so it
 * matches Holding.sportsCardItemId directly with no prefixing needed.
 */
function sportsItemToSearchItem(r: SportsRow, gameId: string): CatalogSearchItem {
  const setName = [r.year, r.distributor, r.setName].filter(Boolean).join(" ").trim();
  return {
    id: r.id,
    gameId,
    externalId: r.id,
    name: r.parallelName ? `${r.playerName} — ${r.parallelName}` : r.playerName,
    nameEn: null,
    number: r.cardNumber,
    rarity: null,
    artist: null,
    language: null,
    variantKey: null,
    variantLabel: null,
    cardType: titleCase(r.parallelName ?? r.cardType),
    domain: [],
    imageSmallUrl: r.imageUrl,
    setName,
    setNameEn: null,
    releaseDate: r.releaseDate ? r.releaseDate.toISOString().slice(0, 10) : null,
    productType: "CARD",
    priceRaw: r.latestPriceRaw != null ? Number(r.latestPriceRaw) : null,
    priceChangePct: r.priceChangePct,
    hasPrice: r.latestPriceDate != null,
  };
}

/**
 * Sets tiles for a sports-kind game synthesize a setId as
 * "<year>::<distributor>::<setName>" (see app/sets/[game]/page.tsx) since
 * SportsCardItem has no Set relation to point at. Decodes that back into
 * the three structural where-clause fields; rejoins any remainder so a
 * setName that happens to contain "::" round-trips correctly.
 */
function decodeSportsSetId(
  setId: string | undefined
): { year: number | null; distributor: string | null; setName: string } | undefined {
  if (!setId) return undefined;
  const [yearStr, distributor, ...rest] = setId.split("::");
  return {
    year: yearStr ? Number(yearStr) : null,
    distributor: distributor || null,
    setName: rest.join("::"),
  };
}

/**
 * Finds row ids whose `column` matches `q` once both sides are lowercased
 * and stripped down to letters/digits — see
 * normalizeForPunctuationInsensitiveMatch. Prisma's typed `contains` filter
 * (used elsewhere in this file, including nameSearchVariants' space/hyphen
 * swap) can only compare a query against the *stored* punctuation, so it
 * can't match e.g. a typed "Kaisa" against a stored "Kai'Sa" — there's no
 * way to guess where to reinsert the apostrophe. Normalizing away
 * punctuation on both sides sidesteps that, but the normalization has to
 * happen in the database, not just on the query string, since `contains`
 * only ever sees the raw column value — hence the raw query. `strpos` (not
 * `LIKE`) so a query containing `%`/`_` isn't treated as a wildcard.
 * Returns `[]` (no extra matches, not "match everything") when the
 * normalized query is empty, e.g. a query of just punctuation.
 */
async function punctuationInsensitiveIds(
  table: "CatalogItem" | "SportsCardItem",
  q: string
): Promise<string[]> {
  const normalizedQ = normalizeForPunctuationInsensitiveMatch(q);
  if (!normalizedQ) return [];
  if (table === "CatalogItem") {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM "CatalogItem"
      WHERE strpos(regexp_replace(lower(name), '[^a-z0-9]', '', 'g'), ${normalizedQ}) > 0
         OR ("nameEn" IS NOT NULL AND strpos(regexp_replace(lower("nameEn"), '[^a-z0-9]', '', 'g'), ${normalizedQ}) > 0)
    `;
    return rows.map((r) => r.id);
  }
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "SportsCardItem"
    WHERE strpos(regexp_replace(lower("playerName"), '[^a-z0-9]', '', 'g'), ${normalizedQ}) > 0
  `;
  return rows.map((r) => r.id);
}

async function sportsWhereFor(
  params: CatalogSearchParams,
  sportFilter: Sport | { in: Sport[] }
): Promise<Prisma.SportsCardItemWhereInput> {
  const decodedSet = decodeSportsSetId(params.setId);
  const punctuationIds = params.q ? await punctuationInsensitiveIds("SportsCardItem", params.q) : [];
  const qGroup: Prisma.SportsCardItemWhereInput[] | undefined = params.q
    ? [
        // A hyphen/space split on the player's name (rare, but not
        // unheard of — same class of inconsistency as TCG names below)
        // shouldn't make the row unsearchable — see nameSearchVariants.
        ...nameSearchVariants(params.q).map((term) => ({
          playerName: { contains: term, mode: "insensitive" as const },
        })),
        // Apostrophe/hyphen/comma-agnostic match — see
        // punctuationInsensitiveIds.
        ...(punctuationIds.length > 0 ? [{ id: { in: punctuationIds } }] : []),
        { setName: { contains: params.q, mode: "insensitive" } },
        { parallelName: { contains: params.q, mode: "insensitive" } },
        { cardNumber: { contains: params.q, mode: "insensitive" } },
      ]
    : undefined;

  // Card-name chips — see CatalogSearchParams.cardNames. Matched against
  // playerName only (no nameEn equivalent for sports rows).
  const cardNameChips = params.cardNames ?? [];
  const cardNameClauses = (
    await Promise.all(
      cardNameChips.map(async (chip): Promise<Prisma.SportsCardItemWhereInput[]> => {
        if (chip.mode === "is") {
          return [{ playerName: { equals: chip.value, mode: "insensitive" as const } }];
        }
        const terms = nameSearchVariants(chip.value);
        const chipPunctuationIds = await punctuationInsensitiveIds("SportsCardItem", chip.value);
        return [
          ...terms.map((term) => ({ playerName: { contains: term, mode: "insensitive" as const } })),
          ...(chipPunctuationIds.length > 0 ? [{ id: { in: chipPunctuationIds } }] : []),
        ];
      })
    )
  ).flat();
  const cardNamesGroup: Prisma.SportsCardItemWhereInput[] | undefined =
    cardNameClauses.length > 0 ? cardNameClauses : undefined;

  const andClauses: Prisma.SportsCardItemWhereInput[] = [];
  if (qGroup) andClauses.push({ OR: qGroup });
  if (cardNamesGroup) andClauses.push({ OR: cardNamesGroup });

  return {
    sport: sportFilter,
    year: decodedSet ? decodedSet.year : undefined,
    distributor: decodedSet ? decodedSet.distributor : undefined,
    setName: decodedSet ? decodedSet.setName : undefined,
    parallelName: params.baseOnly ? null : undefined,
    AND: andClauses.length > 0 ? andClauses : undefined,
    id: params.onlyIds
      ? { in: params.onlyIds }
      : params.excludeIds
        ? { notIn: params.excludeIds }
        : undefined,
  };
}

/**
 * SportsCardItem has no rarity, language, artist, or finish/variant column,
 * and its own `cardType` taxonomy ("base"/"insert"/"short_print") means
 * something entirely different from CatalogItem's game-specific cardType
 * (e.g. Riftbound's "Champion Unit") shown in the same shared filter
 * dropdown — so sports rows deliberately don't participate in the
 * cardType/rarity/language/artist/variant facets (their nearest equivalent,
 * parallelName, has its own separate "Show all parallels" toggle, on by
 * default so results collapse to one row per base card), and sealed
 * products don't exist for sports cards at all.
 */
function sportsFilterableFor(params: CatalogSearchParams): boolean {
  return (
    !isFilterSet(params.cardType) &&
    !isFilterSet(params.rarity) &&
    !isFilterSet(params.language) &&
    !isFilterSet(params.artist) &&
    !isFilterSet(params.variant) &&
    !isFilterSet(params.domain) &&
    params.productType !== "SEALED"
  );
}

async function tcgWhereFor(
  params: CatalogSearchParams,
  gameIdFilter: string | { in: string[] }
): Promise<Prisma.CatalogItemWhereInput> {
  // Two independent OR-groups can be in play here — the free-text q search
  // and the artist-chip list — and Prisma only allows one `OR` key per
  // where object. Each group is wrapped in its own `{ OR: [...] }` and
  // combined via a top-level `AND: [...]` array instead (Prisma implicitly
  // ANDs every top-level where key together regardless, so `AND: [{ OR:
  // qGroup }]` alone is behaviorally identical to the old bare `OR: qGroup`
  // when only q is set — this refactor is non-breaking for existing callers).
  // Catalog names are stored verbatim from each source and are genuinely
  // inconsistent about whether a suffix like "EX"/"GX" is joined with a
  // space or a hyphen (e.g. "Blaziken-EX" vs "Blaziken ex") — expanding the
  // query into both forms keeps a typed space from making a hyphenated row
  // (or vice versa) unsearchable. See nameSearchVariants.
  const qTerms = params.q ? nameSearchVariants(params.q) : [];
  const punctuationIds = params.q ? await punctuationInsensitiveIds("CatalogItem", params.q) : [];
  const qGroup: Prisma.CatalogItemWhereInput[] | undefined = params.q
    ? [
        ...qTerms.map((term) => ({ name: { contains: term, mode: "insensitive" as const } })),
        // Lets a non-English row (e.g. a JP Pokémon card whose `name` is
        // "アルフの石版") also match its English name ("Alph Lithograph")
        // when populated — see CatalogItem.nameEn. Orthogonal to the
        // `language` filter below, so this matches under "All languages"
        // and under an explicit non-English language filter alike.
        ...qTerms.map((term) => ({ nameEn: { contains: term, mode: "insensitive" as const } })),
        // Apostrophe/hyphen/comma-agnostic match, e.g. "Kaisa"/"Kai Sa" ->
        // "Kai'Sa", or "Irelia Fervent" -> "Irelia - Fervent"/"Irelia,
        // Fervent" — see punctuationInsensitiveIds.
        ...(punctuationIds.length > 0 ? [{ id: { in: punctuationIds } }] : []),
        { artist: { contains: params.q, mode: "insensitive" } },
        { number: { contains: params.q, mode: "insensitive" } },
      ]
    : undefined;

  const artistTerms = toArray(params.artist);
  const artistGroup: Prisma.CatalogItemWhereInput[] | undefined =
    artistTerms.length > 0
      ? artistTerms.map((name) => ({
          artist: { contains: name, mode: "insensitive" as const },
        }))
      : undefined;

  // Scoped name-only chips — see CatalogSearchParams.cardNames. Each chip
  // contributes its own OR-branches (name-variant/punctuation expansion for
  // "contains", exact for "is"), and always checks nameEn too so an
  // English-name chip still matches a non-English row's known translation.
  const cardNameChips = params.cardNames ?? [];
  const cardNameClauses = (
    await Promise.all(
      cardNameChips.map(async (chip): Promise<Prisma.CatalogItemWhereInput[]> => {
        if (chip.mode === "is") {
          return [
            { name: { equals: chip.value, mode: "insensitive" as const } },
            { nameEn: { equals: chip.value, mode: "insensitive" as const } },
          ];
        }
        const terms = nameSearchVariants(chip.value);
        const punctuationIds = await punctuationInsensitiveIds("CatalogItem", chip.value);
        return [
          ...terms.map((term) => ({ name: { contains: term, mode: "insensitive" as const } })),
          ...terms.map((term) => ({ nameEn: { contains: term, mode: "insensitive" as const } })),
          ...(punctuationIds.length > 0 ? [{ id: { in: punctuationIds } }] : []),
        ];
      })
    )
  ).flat();
  const cardNamesGroup: Prisma.CatalogItemWhereInput[] | undefined =
    cardNameClauses.length > 0 ? cardNameClauses : undefined;

  const andClauses: Prisma.CatalogItemWhereInput[] = [];
  if (qGroup) andClauses.push({ OR: qGroup });
  if (artistGroup) andClauses.push({ OR: artistGroup });
  if (cardNamesGroup) andClauses.push({ OR: cardNamesGroup });

  // domain is a string array, so it needs `has`/`hasSome` rather than the
  // scalar equalsOrIn helper (`has` for a single value — matches either
  // domain of a dual-domain Legend; `hasSome` OR's across a Views chip list).
  const domainValues = toArray(params.domain);
  const domainFilter: Prisma.CatalogItemWhereInput["domain"] =
    domainValues.length === 0
      ? undefined
      : domainValues.length === 1
        ? { has: domainValues[0] }
        : { hasSome: domainValues };

  return {
    gameId: gameIdFilter,
    setId: params.setId,
    productType: params.productType,
    cardType: equalsOrIn(params.cardType),
    rarity: equalsOrIn(params.rarity),
    domain: domainFilter,
    language: equalsOrIn(params.language),
    variantKey: equalsOrIn(params.variant),
    id: params.onlyIds
      ? { in: params.onlyIds }
      : params.excludeIds
        ? { notIn: params.excludeIds }
        : undefined,
    AND: andClauses.length > 0 ? andClauses : undefined,
  };
}

const TCG_SELECT = {
  id: true,
  gameId: true,
  externalId: true,
  variantKey: true,
  name: true,
  nameEn: true,
  number: true,
  rarity: true,
  artist: true,
  cardType: true,
  domain: true,
  language: true,
  imageSmallUrl: true,
  productType: true,
  latestPriceRaw: true,
  priceChangePct: true,
  latestPriceDate: true,
  // `code` (the provider's own set id, e.g. pokemontcg.io's "base6") is
  // what the curated finish-pattern overlay keys off of — see
  // getFinishDisplayLabel — not Set.id (which is prefixed "<gameId>:").
  set: { select: { name: true, nameEn: true, releaseDate: true, code: true } },
} satisfies Prisma.CatalogItemSelect;

type TcgRow = Prisma.CatalogItemGetPayload<{ select: typeof TCG_SELECT }>;

function tcgItemToSearchItem(r: TcgRow): CatalogSearchItem {
  // "" (the default for every non-Pokémon row) means "no finish concept" —
  // normalize it to null here so CatalogSearchItem.variantKey/variantLabel
  // read the same way sports rows' do, rather than leaking the storage
  // sentinel out to callers.
  const variantKey = r.variantKey || null;
  const variantLabel = variantKey
    ? getFinishDisplayLabel(r.set.code, variantKey, defaultFinishLabel(variantKey))
    : null;
  return {
    id: r.id,
    gameId: r.gameId,
    externalId: r.externalId,
    name: r.name,
    nameEn: r.nameEn,
    number: r.number,
    rarity: r.rarity,
    artist: r.artist,
    cardType: r.cardType,
    domain: r.domain,
    language: r.language,
    variantKey,
    variantLabel,
    imageSmallUrl: r.imageSmallUrl,
    setName: r.set.name,
    setNameEn: r.set.nameEn,
    releaseDate: r.set.releaseDate ? r.set.releaseDate.toISOString().slice(0, 10) : null,
    productType: r.productType,
    priceRaw: r.latestPriceRaw != null ? Number(r.latestPriceRaw) : null,
    priceChangePct: r.priceChangePct,
    hasPrice: r.latestPriceDate != null,
  };
}

// Cap for the in-memory natural sort paths below (number_asc can't be
// expressed as a DB orderBy — see compareCardNumbers) — bounds cost at deep
// pagination the same way MERGE_FETCH_CAP does for the merged search.
const NUMBER_SORT_FETCH_CAP = 1000;

async function runTcgQuery(
  params: CatalogSearchParams,
  gameIdFilter: string | { in: string[] },
  page: number,
  pageSize: number,
  sort: CatalogSort
) {
  const where = await tcgWhereFor(params, gameIdFilter);

  if (sort === "number_asc" || sort === "domain_asc") {
    const [rows, total] = await Promise.all([
      db.catalogItem.findMany({ where, take: NUMBER_SORT_FETCH_CAP, select: TCG_SELECT }),
      db.catalogItem.count({ where }),
    ]);
    const compare =
      sort === "domain_asc"
        ? (a: CatalogSearchItem, b: CatalogSearchItem) =>
            compareDomains(a.domain, b.domain) || a.name.localeCompare(b.name)
        : (a: CatalogSearchItem, b: CatalogSearchItem) =>
            compareCardNumbers(a.number, b.number) || a.name.localeCompare(b.name);
    const items = rows.map(tcgItemToSearchItem).sort(compare).slice((page - 1) * pageSize, page * pageSize);
    return { items, total };
  }

  const [rows, total] = await Promise.all([
    db.catalogItem.findMany({
      where,
      orderBy: orderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: TCG_SELECT,
    }),
    db.catalogItem.count({ where }),
  ]);

  return { items: rows.map(tcgItemToSearchItem), total };
}

async function runSportsQuery(
  params: CatalogSearchParams,
  sportFilter: Sport | { in: Sport[] },
  gameId: string,
  page: number,
  pageSize: number,
  sort: CatalogSort
) {
  const where = await sportsWhereFor(params, sportFilter);

  if (sort === "number_asc") {
    const [rows, total] = await Promise.all([
      db.sportsCardItem.findMany({ where, take: NUMBER_SORT_FETCH_CAP, select: SPORTS_SELECT }),
      db.sportsCardItem.count({ where }),
    ]);
    const items = rows
      .map((r) => sportsItemToSearchItem(r, gameId))
      .sort((a, b) => compareCardNumbers(a.number, b.number) || a.name.localeCompare(b.name))
      .slice((page - 1) * pageSize, page * pageSize);
    return { items, total };
  }

  const [rows, total] = await Promise.all([
    db.sportsCardItem.findMany({
      where,
      orderBy: sportsOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: SPORTS_SELECT,
    }),
    db.sportsCardItem.count({ where }),
  ]);

  return { items: rows.map((r) => sportsItemToSearchItem(r, gameId)), total };
}

function compareNullsLast(x: number | null, y: number | null, ascending: boolean): number {
  if (x == null && y == null) return 0;
  if (x == null) return 1;
  if (y == null) return -1;
  return ascending ? x - y : y - x;
}

/** Same nulls-last shape as compareNullsLast, for ISO "YYYY-MM-DD" strings (lexicographic == chronological). */
function compareNullsLastStr(x: string | null, y: string | null, ascending: boolean): number {
  if (x == null && y == null) return 0;
  if (x == null) return 1;
  if (y == null) return -1;
  return ascending ? x.localeCompare(y) : y.localeCompare(x);
}

/**
 * Natural, numeric-aware comparison for card numbers, nulls last. Plain
 * lexicographic order breaks on the un-padded numbers several games use
 * (Riftbound's "10" sorts before "2"; a sports "cardNumber" like "1-GG" vs
 * "10"), so this leans on Intl's numeric collation instead — it treats
 * embedded digit runs as numbers while still comparing letters normally,
 * which handles zero-padded Pokémon numbers ("025/198"), plain digits
 * (Riftbound), and alpha-prefixed ones (FAB's "BOL024") correctly.
 */
function compareCardNumbers(a: string | null, b: string | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Ranks by each row's first domain against RIFTBOUND_DOMAIN_ORDER (a dual-
 * domain Legend's second domain doesn't affect its sort position — only
 * which group it groups into). Rows with no domain (every non-Riftbound
 * game) sort last, same nulls-last convention as compareCardNumbers.
 */
function compareDomains(a: string[], b: string[]): number {
  const [da, db_] = [a[0], b[0]];
  if (da == null && db_ == null) return 0;
  if (da == null) return 1;
  if (db_ == null) return -1;
  const ai = RIFTBOUND_DOMAIN_ORDER.indexOf(da);
  const bi = RIFTBOUND_DOMAIN_ORDER.indexOf(db_);
  if (ai === -1 && bi === -1) return da.localeCompare(db_);
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}

/**
 * Final ordering applied to the in-memory merge of TCG + sports results
 * (see searchMerged below). Each source table's own DB-side orderBy only
 * needs to produce a correctly-sorted top-N locally — this is what actually
 * determines the merged order, so the two don't need to stay in lockstep.
 */
function compareSearchItems(a: CatalogSearchItem, b: CatalogSearchItem, sort: CatalogSort): number {
  switch (sort) {
    case "price_desc":
      return compareNullsLast(a.priceRaw, b.priceRaw, false) || a.name.localeCompare(b.name);
    case "price_asc":
      return compareNullsLast(a.priceRaw, b.priceRaw, true) || a.name.localeCompare(b.name);
    case "trending_up":
      return compareNullsLast(a.priceChangePct, b.priceChangePct, false);
    case "trending_down":
      return compareNullsLast(a.priceChangePct, b.priceChangePct, true);
    case "type_asc": {
      const ct = (a.cardType ?? "").localeCompare(b.cardType ?? "");
      return ct !== 0 ? ct : a.name.localeCompare(b.name);
    }
    case "number_asc":
      return compareCardNumbers(a.number, b.number) || a.name.localeCompare(b.name);
    case "domain_asc":
      return compareDomains(a.domain, b.domain) || a.name.localeCompare(b.name);
    case "release_desc":
      return (
        compareNullsLastStr(a.releaseDate, b.releaseDate, false) || a.name.localeCompare(b.name)
      );
    case "release_asc":
      return (
        compareNullsLastStr(a.releaseDate, b.releaseDate, true) || a.name.localeCompare(b.name)
      );
    case "name_asc":
    case "best_match":
    default:
      return a.name.localeCompare(b.name);
  }
}

const MERGE_FETCH_CAP = 1000; // bounds cost at deep pagination (~16 pages at pageSize 60)

async function searchMerged(
  params: CatalogSearchParams,
  page: number,
  pageSize: number,
  sort: CatalogSort
) {
  const includeSports = sportsFilterableFor(params) && WIRED_SPORT_ENUMS.length > 0;
  // number_asc/domain_asc have no matching DB orderBy (see compareCardNumbers/
  // compareDomains), so the DB-side "take N" can't be trusted to contain the
  // true top-N — fetch up to the full cap regardless of page so the
  // in-memory sort below sees everything it needs to.
  const fetchN =
    sort === "number_asc" || sort === "domain_asc"
      ? MERGE_FETCH_CAP
      : Math.min(page * pageSize, MERGE_FETCH_CAP);

  const tcgWhere = await tcgWhereFor(params, { in: WIRED_TCG_GAME_IDS });
  const sportsGameId = WIRED_SPORTS_GAMES[0]?.id ?? "basketball-nba";
  const sportsWhere = includeSports
    ? await sportsWhereFor(params, { in: WIRED_SPORT_ENUMS })
    : undefined;

  const [tcgRows, sportsRows, tcgTotal, sportsTotal] = await Promise.all([
    db.catalogItem.findMany({
      where: tcgWhere,
      orderBy: orderBy(sort),
      take: fetchN,
      select: TCG_SELECT,
    }),
    sportsWhere
      ? db.sportsCardItem.findMany({
          where: sportsWhere,
          orderBy: sportsOrderBy(sort),
          take: fetchN,
          select: SPORTS_SELECT,
        })
      : Promise.resolve([]),
    db.catalogItem.count({ where: tcgWhere }),
    sportsWhere ? db.sportsCardItem.count({ where: sportsWhere }) : Promise.resolve(0),
  ]);

  const tcgItems = tcgRows.map(tcgItemToSearchItem);
  const sportsItems = sportsRows.map((r) => sportsItemToSearchItem(r, sportsGameId));

  const merged = [...tcgItems, ...sportsItems].sort((a, b) => compareSearchItems(a, b, sort));
  const items = merged.slice((page - 1) * pageSize, page * pageSize);
  const total = tcgTotal + sportsTotal;

  return { items, total };
}

/**
 * True when `params` carries no active filter/search — i.e. this is
 * Explore's bare default view. Deliberately ignores `page`/`pageSize`/`sort`/
 * `randomFeedUserId` (checked separately by callers) so pagination and the
 * "best_match" default sort don't disqualify the random-feed path.
 */
function hasNoActiveFilters(params: CatalogSearchParams): boolean {
  return (
    !params.q &&
    !params.gameId &&
    !params.setId &&
    !params.productType &&
    !isFilterSet(params.cardType) &&
    !isFilterSet(params.rarity) &&
    !isFilterSet(params.language) &&
    !isFilterSet(params.variant) &&
    !isFilterSet(params.domain) &&
    !isFilterSet(params.artist) &&
    !params.onlyIds &&
    !params.excludeIds &&
    // baseOnly === false is an active choice ("show all parallels") — only
    // true/undefined (both callers' actual default) qualify as "no filters".
    params.baseOnly !== false
  );
}

/** Bounds the eligible-candidate id fetch, same rationale as MERGE_FETCH_CAP. */
const RANDOM_FEED_CANDIDATE_CAP = 1000;

type RandomFeedCandidate = { id: string; source: "tcg" | "sports" };

/**
 * TCG eligibility for the randomized Explore default feed: must have an
 * image, must be priced above $1, and — for non-English rows — must have a
 * populated nameEn (see CatalogItem.nameEn's nullability convention above).
 * English rows (or any row with no language concept) are trivially
 * "properly translated".
 */
const RANDOM_FEED_TCG_WHERE: Prisma.CatalogItemWhereInput = {
  gameId: { in: WIRED_TCG_GAME_IDS },
  imageSmallUrl: { not: null },
  latestPriceRaw: { gt: 1 },
  OR: [{ language: "EN" }, { AND: [{ nameEn: { not: null } }, { nameEn: { not: "" } }] }],
};

/**
 * Sports eligibility — no language/translation concept, so just image +
 * price. `parallelName: null` mirrors sportsWhereFor's baseOnly handling:
 * the random feed is only ever served when baseOnly is true/unset (see
 * hasNoActiveFilters), so it collapses to base cards the same way the
 * normal default view does.
 */
const RANDOM_FEED_SPORTS_WHERE: Prisma.SportsCardItemWhereInput = {
  sport: { in: WIRED_SPORT_ENUMS },
  imageUrl: { not: null },
  latestPriceRaw: { gt: 1 },
  parallelName: null,
};

/**
 * Computes and shuffles the full eligible-candidate id list for the
 * randomized Explore default feed. Cached per-user for 10 minutes
 * (see getRandomExploreFeed) — each cache miss reshuffles, so a user's feed
 * stays stable while the cache entry is warm and reshuffles once it expires.
 */
async function computeShuffledRandomFeedIds(): Promise<RandomFeedCandidate[]> {
  const [tcgRows, sportsRows] = await Promise.all([
    db.catalogItem.findMany({
      where: RANDOM_FEED_TCG_WHERE,
      select: { id: true },
      take: RANDOM_FEED_CANDIDATE_CAP,
    }),
    WIRED_SPORT_ENUMS.length > 0
      ? db.sportsCardItem.findMany({
          where: RANDOM_FEED_SPORTS_WHERE,
          select: { id: true },
          take: RANDOM_FEED_CANDIDATE_CAP,
        })
      : Promise.resolve([]),
  ]);

  const candidates: RandomFeedCandidate[] = [
    ...tcgRows.map((r) => ({ id: r.id, source: "tcg" as const })),
    ...sportsRows.map((r) => ({ id: r.id, source: "sports" as const })),
  ];

  // Fisher-Yates shuffle.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates;
}

/**
 * Randomized, per-user, 10-minute-stable Explore default feed — serves in
 * place of the normal alphabetical listing when Explore has no active
 * filter/search (see hasNoActiveFilters) and a signed-in userId is supplied.
 * The shuffled id order is cached per-user (unstable_cache, revalidate 600s)
 * so it stays put for 10 minutes and then reshuffles on the next request;
 * only the ids are cached, so the actual rows (price, name, etc.) are always
 * fetched fresh at read time.
 */
async function getRandomExploreFeed(userId: string, page: number, pageSize: number) {
  const getShuffledIds = unstable_cache(computeShuffledRandomFeedIds, ["explore-random-feed", userId], {
    revalidate: 600,
  });
  const allIds = await getShuffledIds();
  const pageIds = allIds.slice((page - 1) * pageSize, page * pageSize);

  const tcgIds = pageIds.filter((c) => c.source === "tcg").map((c) => c.id);
  const sportsIds = pageIds.filter((c) => c.source === "sports").map((c) => c.id);

  const [tcgRows, sportsRows] = await Promise.all([
    tcgIds.length > 0
      ? db.catalogItem.findMany({ where: { id: { in: tcgIds } }, select: TCG_SELECT })
      : Promise.resolve([]),
    sportsIds.length > 0
      ? db.sportsCardItem.findMany({ where: { id: { in: sportsIds } }, select: SPORTS_SELECT })
      : Promise.resolve([]),
  ]);

  const sportsGameId = WIRED_SPORTS_GAMES[0]?.id ?? "basketball-nba";
  const itemsById = new Map<string, CatalogSearchItem>([
    ...tcgRows.map((r) => [r.id, tcgItemToSearchItem(r)] as const),
    ...sportsRows.map((r) => [r.id, sportsItemToSearchItem(r, sportsGameId)] as const),
  ]);

  // Re-sort fetched rows back into the cached shuffle order (findMany with
  // `id: { in }` doesn't preserve the given order).
  const items = pageIds
    .map((c) => itemsById.get(c.id))
    .filter((item): item is CatalogSearchItem => item != null);

  return { items, total: allIds.length };
}

export async function searchCatalog(params: CatalogSearchParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 60) : 24;
  const sort = params.sort ?? "best_match";

  if (params.randomFeedUserId && sort === "best_match" && hasNoActiveFilters(params)) {
    const result = await getRandomExploreFeed(params.randomFeedUserId, page, pageSize);
    return { items: result.items, total: result.total, page, pageSize };
  }

  const requestedMeta = params.gameId ? getGameMeta(params.gameId) : undefined;

  let result: { items: CatalogSearchItem[]; total: number };
  if (params.gameId && requestedMeta?.kind === "sports") {
    // Single sports game — fully correct, single-table pagination, same
    // cost shape as the TCG fast path below. No `sport` mapped (shouldn't
    // happen for a real registry entry) just matches nothing.
    const sportFilter: Sport | { in: Sport[] } = requestedMeta.sport ?? { in: [] };
    result = await runSportsQuery(params, sportFilter, params.gameId, page, pageSize, sort);
  } else if (params.gameId) {
    // Single TCG game — the exact original CatalogItem-only query, byte-
    // for-byte unchanged behavior from before sports cards existed.
    result = await runTcgQuery(params, params.gameId, page, pageSize, sort);
  } else {
    // "All games" — merge WIRED TCG + WIRED sports.
    result = await searchMerged(params, page, pageSize, sort);
  }

  return { items: result.items, total: result.total, page, pageSize };
}

// Caps for resolveCuratedSetMatches below — bounds cost the same way
// MERGE_FETCH_CAP/NUMBER_SORT_FETCH_CAP do elsewhere in this file, just
// applied per-query (CURATED_SET_QUERY_CAP) and across the whole curated
// set (CURATED_SET_TOTAL_CAP), since a set can span several games/sets.
const CURATED_SET_QUERY_CAP = 1500;
const CURATED_SET_TOTAL_CAP = 5000;

/**
 * Resolves a Curated Set's filters (src/lib/curated-sets/types.ts) into the
 * full, non-paginated list of matching catalog items — used to compute
 * "owned vs total" progress (src/lib/curated-sets/progress.ts) and to
 * render a curated set's detail grid. Unlike searchCatalog, which always
 * paginates (capped at pageSize 60 for the public /api/catalog/search
 * route), this fetches everything a curated set matches, up to
 * CURATED_SET_TOTAL_CAP — appropriate here because it's only ever called
 * for a signed-in user's own small number of saved curated sets, not on
 * every keystroke of a public search.
 *
 * Reuses the exact same per-game where-builders (tcgWhereFor/sportsWhereFor)
 * and row mappers (tcgItemToSearchItem/sportsItemToSearchItem) as
 * searchCatalog/searchMerged above, so a curated set's match list can never
 * drift from what Explore/Views would show for the same filters.
 */
export async function resolveCuratedSetMatches(
  filters: CuratedSetFilters
): Promise<{ items: CatalogSearchItem[]; truncated: boolean }> {
  const gameMetas = (filters.games.length > 0 ? filters.games : GAMES.map((g) => g.id))
    .map((id) => getGameMeta(id))
    .filter((g): g is NonNullable<ReturnType<typeof getGameMeta>> => g != null && g.status === "WIRED");

  const baseParams: CatalogSearchParams = {
    productType: filters.type !== "all" ? filters.type : undefined,
    cardType: filters.cardTypes.length > 0 ? filters.cardTypes : undefined,
    rarity: filters.rarities.length > 0 ? filters.rarities : undefined,
    domain: filters.domains.length > 0 ? filters.domains : undefined,
    language: filters.languages.length > 0 ? filters.languages : undefined,
    artist: filters.artists.length > 0 ? filters.artists : undefined,
    variant: filters.variants.length > 0 ? filters.variants : undefined,
    cardNames: filters.cardNames.length > 0 ? filters.cardNames : undefined,
    baseOnly: filters.baseOnly,
  };

  const items: CatalogSearchItem[] = [];
  let truncated = false;

  for (const meta of gameMetas) {
    if (items.length >= CURATED_SET_TOTAL_CAP) {
      truncated = true;
      break;
    }
    const isSports = meta.kind === "sports";
    // Sports rows don't participate in the TCG-only facets (cardType/
    // rarity/language/artist/variant/domain, or a SEALED filter) — same
    // gate searchMerged uses via sportsFilterableFor.
    if (isSports && !sportsFilterableFor(baseParams)) continue;

    // Set.id is "<gameId>:<code>" (see scripts/seed-catalog.ts), so a
    // curated set's flat `sets` list can be bucketed back to the games
    // that own each entry. Sports set ids have no such game-scoping (see
    // decodeSportsSetId) and no sets picker in the builder, so sports
    // games are always queried unscoped by set — same "no sets concept"
    // treatment sports already gets elsewhere (sportsFilterableFor above).
    const setIdsForGame = isSports
      ? []
      : filters.sets.filter((setId) => setId.startsWith(`${meta.id}:`));

    const setScopes: (string | undefined)[] = setIdsForGame.length > 0 ? setIdsForGame : [undefined];

    for (const setId of setScopes) {
      if (items.length >= CURATED_SET_TOTAL_CAP) {
        truncated = true;
        break;
      }
      const params: CatalogSearchParams = { ...baseParams, setId };
      if (isSports) {
        const sportFilter: Sport | { in: Sport[] } = meta.sport ?? { in: [] };
        const result = await runSportsQuery(params, sportFilter, meta.id, 1, CURATED_SET_QUERY_CAP, "name_asc");
        items.push(...result.items);
        if (result.items.length >= CURATED_SET_QUERY_CAP) truncated = true;
      } else {
        const result = await runTcgQuery(params, meta.id, 1, CURATED_SET_QUERY_CAP, "name_asc");
        items.push(...result.items);
        if (result.items.length >= CURATED_SET_QUERY_CAP) truncated = true;
      }
    }
  }

  if (items.length > CURATED_SET_TOTAL_CAP) {
    truncated = true;
    items.length = CURATED_SET_TOTAL_CAP;
  }

  return { items, truncated };
}

export interface CardTypeGroup {
  gameId: string;
  gameName: string;
  cardTypes: string[];
}

/**
 * Every distinct non-empty CatalogItem.cardType in the catalog, for
 * populating Explore's "Card Type" filter — read from real data rather than
 * a hardcoded list so it stays accurate as new sets/supertypes get seeded.
 * Grouped by game, since card-type taxonomies don't overlap between games
 * (Riftbound's "Champion Unit" vs Flesh & Blood's "Hero") — the sidebar uses
 * the groups to render one collapsed-by-default subsection per game when
 * "All games" is selected. Optionally scoped to a single game, in which
 * case the result is a single-element (or empty) array. Not every game
 * populates this column (e.g. Pokémon doesn't), so games with no card types
 * are omitted entirely rather than returned as an empty group. Some FAB
 * rows have cardType = "" (not null), so both null and "" are excluded,
 * mirroring getDistinctRarities below. Deliberately CatalogItem-only — see
 * sportsFilterableFor() above for why sports cards don't participate here.
 */
export const getDistinctCardTypes = unstable_cache(
  async (gameId?: string): Promise<CardTypeGroup[]> => {
    const rows = await db.catalogItem.findMany({
      where: { gameId, NOT: [{ cardType: null }, { cardType: "" }] },
      distinct: ["gameId", "cardType"],
      select: { gameId: true, cardType: true },
      orderBy: { cardType: "asc" },
    });
    const byGame = new Map<string, string[]>();
    for (const row of rows) {
      const list = byGame.get(row.gameId);
      if (list) list.push(row.cardType as string);
      else byGame.set(row.gameId, [row.cardType as string]);
    }
    return GAMES.filter((g) => byGame.has(g.id)).map((g) => ({
      gameId: g.id,
      gameName: g.name,
      cardTypes: byGame.get(g.id)!,
    }));
  },
  ["catalog-card-types"],
  // Changes only when the catalog is reseeded/re-crawled, far less often
  // than the once-daily price-snapshot cron — a 1-day TTL is generous
  // headroom, not a tight bound.
  { tags: ["catalog-facets"], revalidate: 86400 }
);

// Per-game rarity tier order, for ranking getDistinctRarities' output instead
// of leaving it alphabetical (alphabetical would put Riftbound's "Epic"
// before "Rare"/"Uncommon", scrambling the tier hierarchy). Only Riftbound
// has a known, verified tier order today — other games fall back to
// alphabetical below.
const RARITY_RANK: Record<string, string[]> = {
  riftbound: RIFTBOUND_RARITY_ORDER,
};

/**
 * Every distinct non-empty CatalogItem.rarity in the catalog, for populating
 * Explore's "Rarity" filter — optionally scoped to a single game, since
 * rarity taxonomies don't overlap between games (Pokémon's "Rare Holo GX" vs
 * Riftbound's "Epic"). Some rows have rarity = "" (not null) from
 * pokemontcg.io promo/sealed entries, so both null and "" are excluded.
 * Deliberately CatalogItem-only — SportsCardItem has no rarity column.
 *
 * Sorted by the game's tier order (RARITY_RANK) when known, so e.g.
 * Riftbound's filter list reads Common → Uncommon → Rare → Epic → Showcase →
 * Promo rather than alphabetically; unranked values (unknown game, or a
 * future rarity string not yet in the rank list) sort alphabetically after
 * the known ones.
 */
export const getDistinctRarities = unstable_cache(
  async (gameId?: string): Promise<string[]> => {
    const rows = await db.catalogItem.findMany({
      where: { gameId, NOT: [{ rarity: null }, { rarity: "" }] },
      distinct: ["rarity"],
      select: { rarity: true },
    });
    const values = rows.map((r) => r.rarity as string);
    const rank = gameId ? RARITY_RANK[gameId] : undefined;
    if (!rank) return values.sort((a, b) => a.localeCompare(b));
    return values.sort((a, b) => {
      const ai = rank.indexOf(a);
      const bi = rank.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  },
  ["catalog-rarities"],
  { tags: ["catalog-facets"], revalidate: 86400 }
);

// Per-game domain order, same idea as RARITY_RANK above. Only Riftbound has
// a domain concept today.
const DOMAIN_RANK: Record<string, string[]> = {
  riftbound: RIFTBOUND_DOMAIN_ORDER,
};

/**
 * Every distinct value across every CatalogItem.domain array in the catalog,
 * for populating Explore's "Domain" filter — optionally scoped to a single
 * game. Unlike getDistinctRarities/getDistinctCardTypes, `domain` is a
 * Postgres array column: Prisma's `distinct` would dedupe whole arrays
 * (["Calm"] vs ["Calm","Body"] count as different rows), not the individual
 * strings inside them, so this fetches every non-empty array and flattens
 * it in memory instead. Riftbound-only today (every other game's `domain`
 * is always `[]`, so this returns `[]` for them without a special case).
 */
export const getDistinctDomains = unstable_cache(
  async (gameId?: string): Promise<string[]> => {
    const rows = await db.catalogItem.findMany({
      where: { gameId, NOT: { domain: { isEmpty: true } } },
      select: { domain: true },
    });
    const values = Array.from(new Set(rows.flatMap((r) => r.domain)));
    const rank = gameId ? DOMAIN_RANK[gameId] : undefined;
    if (!rank) return values.sort((a, b) => a.localeCompare(b));
    return values.sort((a, b) => {
      const ai = rank.indexOf(a);
      const bi = rank.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  },
  ["catalog-domains"],
  { tags: ["catalog-facets"], revalidate: 86400 }
);

export interface VariantGroup {
  gameId: string;
  gameName: string;
  variants: { key: string; label: string }[];
}

/**
 * Every distinct priced finish in the catalog, for populating Explore's
 * "Variation" filter — mirrors getDistinctCardTypes above (grouped by game,
 * collapsed to a single-element array when scoped to one game, omitted
 * entirely for games with no finish data). Deliberately dedupes/groups by
 * the GENERIC finish label (defaultFinishLabel), not any curated per-set
 * collector-pattern override (getFinishDisplayLabel) — the filter itself
 * has to stay a small, stable taxonomy (at most one entry per provider
 * finish key) so picking "Reverse Holo" still matches every set's reverse
 * holos, including ones with a curated override like Legendary Collection's
 * "Cracked Ice Holo" (that name is purely a per-tile display overlay, see
 * tcgItemToSearchItem). Deliberately CatalogItem-only — see
 * sportsFilterableFor() above for why sports rows don't participate here.
 *
 * "cosmosHolo" is a deliberate, data-verified exception to the rule above:
 * unlike Cracked Ice Holo, TCGCollector-verified "Cosmos Holo" cards are
 * given their own distinct variantKey at import time (see
 * scripts/apply-cosmos-holo-variant.ts), so they surface here as their own
 * filter entry rather than folding into "Reverse Holo".
 */
export const getDistinctVariants = unstable_cache(
  async (gameId?: string): Promise<VariantGroup[]> => {
    const rows = await db.catalogItem.findMany({
      where: { gameId, NOT: [{ variantKey: "" }] },
      distinct: ["gameId", "variantKey"],
      select: { gameId: true, variantKey: true },
    });
    const byGame = new Map<string, Map<string, string>>(); // gameId -> (finish key -> generic label)
    for (const row of rows) {
      const key = row.variantKey;
      const label = defaultFinishLabel(key);
      const existing = byGame.get(row.gameId);
      if (existing) existing.set(key, label);
      else byGame.set(row.gameId, new Map([[key, label]]));
    }
    return GAMES.filter((g) => byGame.has(g.id)).map((g) => ({
      gameId: g.id,
      gameName: g.name,
      variants: Array.from(byGame.get(g.id)!, ([key, label]) => ({ key, label })).sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
    }));
  },
  ["catalog-variants"],
  { tags: ["catalog-facets"], revalidate: 86400 }
);
