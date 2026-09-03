import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  renameBinder,
  deleteBinder,
  setCoverColor,
  setPageBackground,
  setStatus,
  setGameFilter,
  setLayout,
} from "@/lib/binder/manage";
import { patchBinderSchema } from "@/lib/binder/api-schemas";
import { mutationErrorResponse } from "@/lib/binder/route-errors";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = patchBinderSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid patch" }, { status: 400 });
  const { name, coverColor, pageBackground, status, gameFilter, layout } = parsed.data;

  try {
    if (name !== undefined) await renameBinder(session.user.id, id, name);
    if (coverColor !== undefined) await setCoverColor(session.user.id, id, coverColor);
    if (pageBackground !== undefined) await setPageBackground(session.user.id, id, pageBackground);
    if (status !== undefined) await setStatus(session.user.id, id, status);
    if (gameFilter !== undefined) await setGameFilter(session.user.id, id, gameFilter);
    if (layout !== undefined) await setLayout(session.user.id, id, layout.layoutId, layout.pages);
  } catch (err) {
    return mutationErrorResponse(err, { route: "PATCH /api/binder/[id]", userId: session.user.id, binderId: id });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deleteBinder(session.user.id, id);
  } catch (err) {
    return mutationErrorResponse(err, { route: "DELETE /api/binder/[id]", userId: session.user.id, binderId: id });
  }
  return NextResponse.json({ ok: true });
}
