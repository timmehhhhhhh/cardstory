import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { importLocalPortfolio } from "@/lib/portfolio/manage";
import { portfolioSchema } from "@/lib/portfolio/api-schemas";

const bodySchema = z.object({ portfolios: z.array(portfolioSchema).max(50) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid import payload" }, { status: 400 });

  await importLocalPortfolio(session.user.id, parsed.data.portfolios);
  return NextResponse.json({ ok: true });
}
