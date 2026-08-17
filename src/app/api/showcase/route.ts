import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";

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
  pcName: z.string(),
  currency: z.string(),
  totalValue: z.number(),
  totalGainLoss: z.number(),
  totalGainLossPct: z.number().nullable(),
  itemCount: z.number(),
  items: z.array(itemSchema).max(200),
});

const bodySchema = z.object({
  title: z.string().max(120).optional(),
  payload: payloadSchema,
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid showcase payload" }, { status: 400 });
  }

  // ownerToken is still generated and returned even for a logged-in
  // publisher — it stays the credential this browser uses to edit/delete
  // the snapshot, so publishing doesn't require staying signed in from the
  // same device. userId is recorded alongside it, additively.
  const session = await auth();
  const ownerToken = randomUUID();
  const snapshot = await db.showcaseSnapshot.create({
    data: {
      ownerToken,
      userId: session?.user?.id,
      title: parsed.data.title ?? parsed.data.payload.pcName,
      payload: parsed.data.payload,
    },
  });

  if (session?.user) {
    await logActivity(session.user.id, {
      action: "showcase.published",
      entityType: "showcase",
      entityId: snapshot.id,
      summary: `Published showcase "${snapshot.title ?? parsed.data.payload.pcName}"`,
    });
  }

  return NextResponse.json({ shareId: snapshot.id, ownerToken });
}
