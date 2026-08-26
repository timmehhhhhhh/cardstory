import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateCuratedSet, deleteCuratedSet } from "@/lib/curated-sets/manage";
import { patchCuratedSetSchema } from "@/lib/curated-sets/api-schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = patchCuratedSetSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  try {
    await updateCuratedSet(session.user.id, id, parsed.data);
  } catch {
    return NextResponse.json({ error: "Curated set not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deleteCuratedSet(session.user.id, id);
  } catch {
    return NextResponse.json({ error: "Curated set not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
