import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { renameView, updateViewFilters, deleteView } from "@/lib/views/manage";
import { patchViewSchema } from "@/lib/views/api-schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = patchViewSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  try {
    if (parsed.data.name !== undefined) await renameView(session.user.id, id, parsed.data.name);
    if (parsed.data.filters !== undefined) {
      await updateViewFilters(session.user.id, id, parsed.data.filters);
    }
  } catch {
    return NextResponse.json({ error: "View not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deleteView(session.user.id, id);
  } catch {
    return NextResponse.json({ error: "View not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
