import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { computePCValueHistory } from "@/lib/pc/value-history";
import { PC_CHART_RANGES } from "@/lib/constants";

const bodySchema = z.object({
  holdings: z.array(
    z.object({
      catalogItemId: z.string(),
      quantity: z.number(),
      acquiredAt: z.string(),
    })
  ),
  range: z.enum(PC_CHART_RANGES),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const points = await computePCValueHistory(parsed.data.holdings, parsed.data.range);
  return NextResponse.json({ points });
}
