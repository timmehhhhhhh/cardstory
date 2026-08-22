import { unstable_cache } from "next/cache";
import { Prisma, type Sport } from "@prisma/client";
import { db } from "@/lib/db";
import { GAMES, WIRED_SPORTS_GAMES, getGameMeta } from "@/lib/games/registry";
import { defaultFinishLabel } from "@/lib/games/pokemon/mapper";
import { getFinishDisplayLabel } from "@/lib/games/pokemon/finish-patterns";
import { nameSearchVariants } from "@/lib/utils/name-match";

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
   * Illustrator credit — see CatalogItem.artist. Unlike cardType/rarity/
   * language, this never matches by exact equality: each value is matched
   * via a case-insensitive "contains", OR'd across every value given (so a
   * Views artist chip list like ["Yuka Morii", "Sashiko Ito"] matches
   * either). No-op/excludes sports rows (no artist column) — see
   * sportsFilterableFor below.
   */
  artist?: string | string[];
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

function sportsWhereFor(
  params: CatalogSearchParams,
  sportFilter: Sport | { in: Sport[] }
): Prisma.SportsCardItemWhereInput {
  const decodedSet = decodeSportsSetId(params.setId);
  return {
    sport: sportFilter,
    year: decodedSet ? decodedSet.year : undefined,
    distributor: decodedSet ? decodedSet.distributor : undefined,
    setName: decodedSet ? decodedSet.setName : undefined,
    parallelName: params.baseOnly ? null : undefined,
    OR: params.q
      ? [
          // A hyphen/space split on the player's name (rare, but not
          // unheard of — same class of inconsistency as TCG names below)
          // shouldn't make the row unsearchable — see nameSearchVariants.
          ...nameSearchVariants(params.q).map((term) => ({
            playerName: { contains: term, mode: "insensitive" as const },
          })),
          { setName: { contains: params.q, mode: "insensitive" } },
          { parallelName: { contains: params.q, mode: "insensitive" } },
          { cardNumber: { contains: params.q, mode: "insensitive" } },
        ]
      : undefined,
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
 * parallelName, has its own separate "Hide parallels" toggle), and sealed
 * products don't exist for sports cards at all.
 */
function sportsFilterableFor(params: CatalogSearchParams): boolean {
  return (
    !isFilterSet(params.cardType) &&
    !isFilterSet(params.rarity) &&
    !isFilterSet(params.language) &&
    !isFilterSet(params.artist) &&
    !isFilterSet(params.variant) &&
    params.productType !== "SEALED"
  );
}

function tcgWhereFor(
  params: CatalogSearchParams,
  gameIdFilter: string | { in: string[] }
): Prisma.CatalogItemWhereInput {
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
  const qGroup: Prisma.CatalogItemWhereInput[] | undefined = params.q
    ? [
        ...qTerms.map((term) => ({ name: { contains: term, mode: "insensitive" as const } })),
        // Lets a non-English row (e.g. a JP Pokémon card whose `name` is
        // "アルフの石版") also match its English name ("Alph Lithograph")
        // when populated — see CatalogItem.nameEn. Orthogonal to the
        // `language` filter below, so this matches under "All languages"
        // and under an explicit non-English language filter alike.
        ...qTerms.map((term) => ({ nameEn: { contains: term, mode: "insensitive" as const } })),
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

  const andClauses: Prisma.CatalogItemWhereInput[] = [];
  if (qGroup) andClauses.push({ OR: qGroup });
  if (artistGroup) andClauses.push({ OR: artistGroup });

  return {
    gameId: gameIdFilter,
    setId: params.setId,
    productType: params.productType,
    cardType: equalsOrIn(params.cardType),
    rarity: equalsOrIn(params.rarity),
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
  const where = tcgWhereFor(params, gameIdFilter);

  if (sort === "number_asc") {
    const [rows, total] = await Promise.all([
      db.catalogItem.findMany({ where, take: NUMBER_SORT_FETCH_CAP, select: TCG_SELECT }),
      db.catalogItem.count({ where }),
    ]);
    const items = rows
      .map(tcgItemToSearchItem)
      .sort((a, b) => compareCardNumbers(a.number, b.number) || a.name.localeCompare(b.name))
      .slice((page - 1) * pageSize, page * pageSize);
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
  const where = sportsWhereFor(params, sportFilter);

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
  // number_asc has no matching DB orderBy (see compareCardNumbers), so the
  // DB-side "take N" can't be trusted to contain the true top-N by number —
  // fetch up to the full cap regardless of page so the in-memory sort below
  // sees everything it needs to.
  const fetchN = sort === "number_asc" ? MERGE_FETCH_CAP : Math.min(page * pageSize, MERGE_FETCH_CAP);

  const tcgWhere = tcgWhereFor(params, { in: WIRED_TCG_GAME_IDS });
  const sportsGameId = WIRED_SPORTS_GAMES[0]?.id ?? "basketball-nba";
  const sportsWhere = includeSports ? sportsWhereFor(params, { in: WIRED_SPORT_ENUMS }) : undefined;

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

export async function searchCatalog(params: CatalogSearchParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 60) : 24;
  const sort = params.sort ?? "best_match";

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

/**
 * Every distinct non-empty CatalogItem.rarity in the catalog, for populating
 * Explore's "Rarity" filter — optionally scoped to a single game, since
 * rarity taxonomies don't overlap between games (Pokémon's "Rare Holo GX" vs
 * Riftbound's "Epic"). Some rows have rarity = "" (not null) from
 * pokemontcg.io promo/sealed entries, so both null and "" are excluded.
 * Deliberately CatalogItem-only — SportsCardItem has no rarity column.
 */
export const getDistinctRarities = unstable_cache(
  async (gameId?: string): Promise<string[]> => {
    const rows = await db.catalogItem.findMany({
      where: { gameId, NOT: [{ rarity: null }, { rarity: "" }] },
      distinct: ["rarity"],
      select: { rarity: true },
      orderBy: { rarity: "asc" },
    });
    return rows.map((r) => r.rarity as string);
  },
  ["catalog-rarities"],
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
