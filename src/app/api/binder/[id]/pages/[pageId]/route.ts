import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { removePage, updatePagePockets } from "@/lib/binder/manage";
import { removePageSchema, patchPagePocketsSchema } from "@/lib/binder/api-schemas";
import { mutationErrorResponse } from "@/lib/binder/route-errors";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, pageId } = await params;
  const parsed = patchPagePocketsSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid pockets" }, { status: 400 });

  try {
    await updatePagePockets(session.user.id, id, pageId, parsed.data.pockets);
  } catch (err) {
    return mutationErrorResponse(err, {
      route: "PATCH /api/binder/[id]/pages/[pageId]",
      userId: session.user.id,
      binderId: id,
      pageId,
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, pageId } = await params;
  const parsed = removePageSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    await removePage(session.user.id, id, pageId, parsed.data.fallbackPage);
  } catch (err) {
    return mutationErrorResponse(err, {
      route: "DELETE /api/binder/[id]/pages/[pageId]",
      userId: session.user.id,
      binderId: id,
      pageId,
    });
  }
  return NextResponse.json({ ok: true });
}
