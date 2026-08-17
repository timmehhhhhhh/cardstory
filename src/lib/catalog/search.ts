import { Prisma, type Sport } from "@prisma/client";
import { db } from "@/lib/db";
import { GAMES, WIRED_SPORTS_GAMES, getGameMeta } from "@/lib/games/registry";

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
  /** Game-specific card type, e.g. Riftbound's "Champion Unit" — see CatalogItem.cardType. */
  cardType?: string;
  /** CatalogItem.rarity, e.g. Pokémon's "Ultra Rare" or Riftbound's "Epic". */
  rarity?: string;
  /** CatalogItem.language, e.g. "EN"/"JP"/"CN"/"TW"/"KR". No-op for sports rows (no language concept). */
  language?: string;
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
  number: string | null;
  rarity: string | null;
  /** Illustrator credit, e.g. Pokémon's "Mitsuhiro Arita". Null for games/rows with no artist credit. */
  artist: string | null;
  cardType: string | null;
  /** CatalogItem.language, e.g. "EN"/"JP"/"CN"/"TW"/"KR". Null for sports rows (no language concept). */
  language: string | null;
  imageSmallUrl: string | null;
  setName: string;
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
    number: r.cardNumber,
    rarity: null,
    artist: null,
    language: null,
    cardType: titleCase(r.parallelName ?? r.cardType),
    imageSmallUrl: r.imageUrl,
    setName,
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
          { playerName: { contains: params.q, mode: "insensitive" } },
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
 * SportsCardItem has no rarity or language column and its own `cardType`
 * taxonomy ("base"/"insert"/"short_print") means something entirely
 * different from CatalogItem's game-specific cardType (e.g. Riftbound's
 * "Champion Unit") shown in the same shared filter dropdown — so sports
 * rows deliberately don't participate in the cardType/rarity/language
 * facets, and sealed products don't exist for sports cards at all.
 */
function sportsFilterableFor(params: CatalogSearchParams): boolean {
  return (
    !params.cardType && !params.rarity && !params.language && params.productType !== "SEALED"
  );
}

function tcgWhereFor(
  params: CatalogSearchParams,
  gameIdFilter: string | { in: string[] }
): Prisma.CatalogItemWhereInput {
  return {
    gameId: gameIdFilter,
    setId: params.setId,
    productType: params.productType,
    cardType: params.cardType,
    rarity: params.rarity,
    language: params.language,
    OR: params.q
      ? [
          { name: { contains: params.q, mode: "insensitive" } },
          { artist: { contains: params.q, mode: "insensitive" } },
          { number: { contains: params.q, mode: "insensitive" } },
        ]
      : undefined,
    id: params.onlyIds
      ? { in: params.onlyIds }
      : params.excludeIds
        ? { notIn: params.excludeIds }
        : undefined,
  };
}

const TCG_SELECT = {
  id: true,
  gameId: true,
  externalId: true,
  name: true,
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
  set: { select: { name: true, releaseDate: true } },
} satisfies Prisma.CatalogItemSelect;

type TcgRow = Prisma.CatalogItemGetPayload<{ select: typeof TCG_SELECT }>;

function tcgItemToSearchItem(r: TcgRow): CatalogSearchItem {
  return {
    id: r.id,
    gameId: r.gameId,
    externalId: r.externalId,
    name: r.name,
    number: r.number,
    rarity: r.rarity,
    artist: r.artist,
    cardType: r.cardType,
    language: r.language,
    imageSmallUrl: r.imageSmallUrl,
    setName: r.set.name,
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
export async function getDistinctCardTypes(gameId?: string): Promise<CardTypeGroup[]> {
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
}

/**
 * Every distinct non-empty CatalogItem.rarity in the catalog, for populating
 * Explore's "Rarity" filter — optionally scoped to a single game, since
 * rarity taxonomies don't overlap between games (Pokémon's "Rare Holo GX" vs
 * Riftbound's "Epic"). Some rows have rarity = "" (not null) from
 * pokemontcg.io promo/sealed entries, so both null and "" are excluded.
 * Deliberately CatalogItem-only — SportsCardItem has no rarity column.
 */
export async function getDistinctRarities(gameId?: string): Promise<string[]> {
  const rows = await db.catalogItem.findMany({
    where: { gameId, NOT: [{ rarity: null }, { rarity: "" }] },
    distinct: ["rarity"],
    select: { rarity: true },
    orderBy: { rarity: "asc" },
  });
  return rows.map((r) => r.rarity as string);
}
