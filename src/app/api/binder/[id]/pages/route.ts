import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addPage } from "@/lib/binder/manage";
import { addPageSchema } from "@/lib/binder/api-schemas";
import { mutationErrorResponse } from "@/lib/binder/route-errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = addPageSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid page" }, { status: 400 });

  try {
    await addPage(session.user.id, id, parsed.data.id, parsed.data.pockets);
  } catch (err) {
    return mutationErrorResponse(err, { route: "POST /api/binder/[id]/pages", userId: session.user.id, binderId: id });
  }
  return NextResponse.json({ ok: true });
}
