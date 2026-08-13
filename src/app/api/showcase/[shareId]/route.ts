import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const itemSchema = z.object({
  catalogItemId: z.string(),
  gameId: z.string(),
  externalId: z.string(),
  name: z.string(),
  imageSmallUrl: z.string().nullable(),
  quantity: z.number(),
  marketValue: z.number(),
});

const payloadSchema = z.object({
  portfolioName: z.string(),
  currency: z.string(),
  totalValue: z.number(),
  totalGainLoss: z.number(),
  totalGainLossPct: z.number().nullable(),
  itemCount: z.number(),
  items: z.array(itemSchema).max(200),
});

const patchSchema = z.object({
  ownerToken: z.string(),
  title: z.string().max(120).optional(),
  payload: payloadSchema,
});

async function assertOwner(shareId: string, ownerToken: string) {
  const snapshot = await db.showcaseSnapshot.findUnique({ where: { id: shareId } });
  if (!snapshot) return { ok: false as const, status: 404 as const };
  if (snapshot.ownerToken !== ownerToken) return { ok: false as const, status: 403 as const };
  return { ok: true as const };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const owner = await assertOwner(shareId, parsed.data.ownerToken);
  if (!owner.ok) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: owner.status });
  }

  const updated = await db.showcaseSnapshot.update({
    where: { id: shareId },
    data: {
      title: parsed.data.title ?? parsed.data.payload.portfolioName,
      payload: parsed.data.payload,
    },
  });

  return NextResponse.json({ shareId: updated.id, updatedAt: updated.updatedAt });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;
  const ownerToken = req.nextUrl.searchParams.get("ownerToken") ?? "";
  const owner = await assertOwner(shareId, ownerToken);
  if (!owner.ok) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: owner.status });
  }
  await db.showcaseSnapshot.delete({ where: { id: shareId } });
  return NextResponse.json({ ok: true });
}
