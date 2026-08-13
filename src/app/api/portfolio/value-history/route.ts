import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computePortfolioValueHistory } from "@/lib/portfolio/value-history";
import { PORTFOLIO_CHART_RANGES } from "@/lib/constants";

const bodySchema = z.object({
  holdings: z.array(
    z.object({
      catalogItemId: z.string(),
      quantity: z.number(),
      acquiredAt: z.string(),
    })
  ),
  range: z.enum(PORTFOLIO_CHART_RANGES),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const points = await computePortfolioValueHistory(parsed.data.holdings, parsed.data.range);
  return NextResponse.json({ points });
}
