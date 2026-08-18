import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateShortlistItem } from "@/lib/shortlist/manage";
import { shortlistPatchSchema } from "@/lib/shortlist/api-schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const parsed = shortlistPatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    await updateShortlistItem(session.user.id, itemId, parsed.data);
  } catch {
    return NextResponse.json({ error: "Shortlist item not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
