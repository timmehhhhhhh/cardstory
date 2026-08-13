import { randomUUID } from "node:crypto";
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

const bodySchema = z.object({
  title: z.string().max(120).optional(),
  payload: payloadSchema,
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid showcase payload" }, { status: 400 });
  }

  const ownerToken = randomUUID();
  const snapshot = await db.showcaseSnapshot.create({
    data: {
      ownerToken,
      title: parsed.data.title ?? parsed.data.payload.portfolioName,
      payload: parsed.data.payload,
    },
  });

  return NextResponse.json({ shareId: snapshot.id, ownerToken });
}
