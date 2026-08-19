import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { renamePC, deletePC } from "@/lib/pc/manage";
import { mutationErrorResponse } from "@/lib/pc/route-errors";

const patchSchema = z.object({ name: z.string().min(1).max(120) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  try {
    await renamePC(session.user.id, id, parsed.data.name);
  } catch (err) {
    return mutationErrorResponse(err, { route: "PATCH /api/pc/[id]", userId: session.user.id, pcId: id });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deletePC(session.user.id, id);
  } catch (err) {
    return mutationErrorResponse(err, { route: "DELETE /api/pc/[id]", userId: session.user.id, pcId: id });
  }
  return NextResponse.json({ ok: true });
}
