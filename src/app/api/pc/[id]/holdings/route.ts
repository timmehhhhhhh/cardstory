import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { addHolding, removeHoldings } from "@/lib/pc/manage";
import { holdingInputSchema } from "@/lib/pc/api-schemas";
import { mutationErrorResponse } from "@/lib/pc/route-errors";

const removeSchema = z.object({ holdingIds: z.array(z.string()).min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = holdingInputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid holding" }, { status: 400 });

  try {
    await addHolding(session.user.id, id, parsed.data);
  } catch (err) {
    return mutationErrorResponse(err, { route: "POST /api/pc/[id]/holdings", userId: session.user.id, pcId: id });
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
  } catch (err) {
    return mutationErrorResponse(err, {
      route: "DELETE /api/pc/[id]/holdings",
      userId: session.user.id,
      pcId: id,
      holdingIds: parsed.data.holdingIds,
    });
  }
  return NextResponse.json({ ok: true });
}
