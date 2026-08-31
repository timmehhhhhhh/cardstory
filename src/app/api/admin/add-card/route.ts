import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ADMIN_MANUAL_ADD_GAMES } from "@/lib/games/registry";

/**
 * Admin-only manual card creation, for cards a user points out are missing
 * from the catalog and that the automated per-game importers (pokemontcg.io/
 * tcgdex.net/riftcodex.com/api.goagain.dev — see lib/games/registry.ts) don't
 * cover, e.g. an obscure promo. No AI/external calls — a plain validated
 * form, straight into CatalogItem/Set via Prisma. Used by
 * src/app/settings/_components/admin-add-card.tsx.
 *
 * Gated on session.user.isAdmin, same DB-only flag (no self-service toggle)
 * as src/app/api/admin/card-family/route.ts, whose style this mirrors.
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) return null;
  return session;
}

function isValidGameId(gameId: string): boolean {
  return ADMIN_MANUAL_ADD_GAMES.some((g) => g.id === gameId);
}

/** Sets available for a given game, for the admin form's set picker. */
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gameId = req.nextUrl.searchParams.get("game");
  if (!gameId || !isValidGameId(gameId)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }

  const sets = await db.set.findMany({
    where: { gameId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, nameEn: true, code: true },
  });
  return NextResponse.json({ sets });
}

const newSetSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  nameEn: z.string().min(1).optional(),
});

const addCardSchema = z
  .object({
    gameId: z.string().min(1),
    setId: z.string().min(1).optional(),
    newSet: newSetSchema.optional(),
    name: z.string().min(1),
    nameEn: z.string().min(1).optional(),
    number: z.string().min(1).optional(),
    rarity: z.string().min(1).optional(),
    artist: z.string().min(1).optional(),
    cardType: z.string().min(1).optional(),
    language: z.string().min(1).default("EN"),
    productType: z.enum(["CARD", "SEALED"]).default("CARD"),
    imageSmallUrl: z.string().url().optional(),
    imageLargeUrl: z.string().url().optional(),
  })
  // Exactly one of setId (pick an existing set) / newSet (create one) — never
  // both, never neither, so a hand-added card always lands somewhere real.
  .refine((v) => !!v.setId !== !!v.newSet, {
    message: "Provide exactly one of setId or newSet",
  });

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = addCardSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const data = parsed.data;

  if (!isValidGameId(data.gameId)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }

  let setId: string;
  if (data.setId) {
    const set = await db.set.findUnique({ where: { id: data.setId }, select: { id: true, gameId: true } });
    if (!set || set.gameId !== data.gameId) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }
    setId = set.id;
  } else {
    // Set.id has no separate unique constraint beyond its own PK — by
    // convention (see scripts/seed-catalog.ts) it's always
    // `${gameId}:${code}`, so upsert (rather than create) so two admins
    // racing on the same new set's code join it instead of erroring.
    const newSet = data.newSet!;
    setId = `${data.gameId}:${newSet.code}`;
    await db.set.upsert({
      where: { id: setId },
      update: {},
      create: { id: setId, gameId: data.gameId, name: newSet.name, nameEn: newSet.nameEn, code: newSet.code },
    });
  }

  // "manual:" can never collide with a provider-sourced externalId (none of
  // pokemontcg.io/tcgdex/riftcodex/api.goagain.dev ever produce one), so this
  // id is guaranteed distinct from every imported card.
  const externalId = `manual:${randomUUID()}`;
  const id = `${data.gameId}:${externalId}`;

  const item = await db.catalogItem.create({
    data: {
      id,
      gameId: data.gameId,
      setId,
      externalId,
      variantKey: "",
      name: data.name,
      nameEn: data.nameEn,
      number: data.number,
      rarity: data.rarity,
      artist: data.artist,
      cardType: data.cardType,
      language: data.language,
      productType: data.productType,
      imageSmallUrl: data.imageSmallUrl,
      imageLargeUrl: data.imageLargeUrl,
    },
    select: { id: true, gameId: true },
  });

  // { expire: 0 } (not the "max" stale-while-revalidate default) makes the
  // *next* read block and refetch synchronously — see the identical comment
  // in src/app/api/admin/card-family/route.ts for why "max" silently never
  // re-fetches on this Cloudflare Workers deployment. catalog-facets too,
  // since a hand-typed rarity/cardType/language could be new to Explore's
  // filter lists (see getDistinct* in lib/catalog/search.ts).
  revalidateTag("catalog-card", { expire: 0 });
  revalidateTag("catalog-facets", { expire: 0 });

  return NextResponse.json({ ok: true, id: item.id, gameId: item.gameId });
}
