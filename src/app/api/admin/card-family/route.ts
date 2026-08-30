import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Admin-only linking/unlinking for CatalogItem.cardFamilyId (see that
 * field's doc comment in prisma/schema.prisma) — the manual correction
 * path alongside scripts/backfill-catalog-family.ts's Pokémon-only
 * heuristic. Used by src/app/card/[game]/[cardId]/_components/
 * admin-family-editor.tsx.
 *
 * Gated on session.user.isAdmin, a DB-only flag with no self-service
 * toggle (unlike isVendor) — see the field's doc comment on User.
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) return null;
  return session;
}

const linkSchema = z.object({ sourceId: z.string().min(1), targetId: z.string().min(1) });

/** Links two cards' families together — merges if either already has one, mints a new id otherwise. */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = linkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { sourceId, targetId } = parsed.data;
  if (sourceId === targetId) {
    return NextResponse.json({ error: "Cannot link a card to itself" }, { status: 400 });
  }

  const [source, target] = await Promise.all([
    db.catalogItem.findUnique({ where: { id: sourceId }, select: { id: true, cardFamilyId: true } }),
    db.catalogItem.findUnique({ where: { id: targetId }, select: { id: true, cardFamilyId: true } }),
  ]);
  if (!source || !target) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  // Adopt whichever side already has a family; mint a fresh one if neither
  // does. If both already have DIFFERENT families, this merges them —
  // every row carrying either stale id gets repointed to the winner, so
  // linking two already-linked families actually joins them instead of
  // leaving a stray second family id floating.
  const familyId = target.cardFamilyId ?? source.cardFamilyId ?? randomUUID();
  const staleFamilyIds = [source.cardFamilyId, target.cardFamilyId].filter(
    (id): id is string => !!id && id !== familyId
  );

  await db.catalogItem.updateMany({
    where: {
      OR: [{ id: { in: [sourceId, targetId] } }, ...(staleFamilyIds.length ? [{ cardFamilyId: { in: staleFamilyIds } }] : [])],
    },
    data: { cardFamilyId: familyId },
  });

  // { expire: 0 } (not the "max" stale-while-revalidate default) makes the
  // *next* read block and refetch synchronously — see the identical
  // comment in src/app/api/admin/revalidate-facets/route.ts for why "max"
  // silently never re-fetches on this Cloudflare Workers deployment.
  revalidateTag("catalog-card", { expire: 0 });
  return NextResponse.json({ ok: true, cardFamilyId: familyId });
}

const unlinkSchema = z.object({ cardId: z.string().min(1) });

/** Removes one card from its family (its cardFamilyId only — other members are untouched). */
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = unlinkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await db.catalogItem.update({ where: { id: parsed.data.cardId }, data: { cardFamilyId: null } });
  revalidateTag("catalog-card", { expire: 0 });
  return NextResponse.json({ ok: true });
}
