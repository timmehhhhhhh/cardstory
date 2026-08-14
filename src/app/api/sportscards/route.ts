import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrReuseSportsCardItem } from "@/lib/sportscards/manage";

const bodySchema = z.object({
  priceChartingId: z.string().optional(),
  sport: z.enum(["NBA", "F1", "UFC", "TENNIS"]),
  year: z.number().int().optional(),
  distributor: z.string().optional(),
  setName: z.string().min(1),
  playerName: z.string().min(1),
  teamName: z.string().optional(),
  cardNumber: z.string().optional(),
  parallelName: z.string().optional(),
  isAutograph: z.boolean().optional(),
  isRelic: z.boolean().optional(),
  serialLimit: z.string().optional(),
  imageUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sports card" }, { status: 400 });
  }
  const id = await createOrReuseSportsCardItem(parsed.data);
  return NextResponse.json({ id });
}
