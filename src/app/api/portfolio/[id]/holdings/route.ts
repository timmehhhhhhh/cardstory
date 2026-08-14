import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { addHolding, removeHoldings } from "@/lib/portfolio/manage";
import { holdingInputSchema } from "@/lib/portfolio/api-schemas";

const removeSchema = z.object({ holdingIds: z.array(z.string()).min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = holdingInputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid holding" }, { status: 400 });

  try {
    await addHolding(session.user.id, id, parsed.data);
  } catch {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = removeSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    await removeHoldings(session.user.id, id, parsed.data.holdingIds);
  } catch {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
