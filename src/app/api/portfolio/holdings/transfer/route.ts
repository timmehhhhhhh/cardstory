import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { transferHoldings } from "@/lib/portfolio/manage";

const bodySchema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
  holdingIds: z.array(z.string()).min(1),
  mode: z.enum(["copy", "move"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { fromId, toId, holdingIds, mode } = parsed.data;
  try {
    await transferHoldings(session.user.id, fromId, toId, holdingIds, mode);
  } catch {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
