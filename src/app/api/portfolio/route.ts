import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { listPortfolios, createPortfolio, ensureDefaultPortfolio } from "@/lib/portfolio/manage";

const createSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let portfolios = await listPortfolios(session.user.id);
  if (portfolios.length === 0) {
    await ensureDefaultPortfolio(session.user.id);
    portfolios = await listPortfolios(session.user.id);
  }
  return NextResponse.json({ portfolios });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid portfolio" }, { status: 400 });
  }

  await createPortfolio(session.user.id, parsed.data.id, parsed.data.name);
  return NextResponse.json({ ok: true });
}
