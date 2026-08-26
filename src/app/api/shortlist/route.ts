import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addShortlistItem, listShortlist, removeShortlistItems } from "@/lib/shortlist/manage";
import { shortlistItemSchema, shortlistRemoveSchema } from "@/lib/shortlist/api-schemas";

export async function GET() {
  const session = await auth();
  // Every route requires a signed-in session (see src/middleware.ts), so
  // session?.user should always be set here — an empty list is still a
  // safe fallback rather than a 401, since this is a read not a mutation,
  // and a 401 would make useQuery throw while the session is still
  // resolving on first paint.
  if (!session?.user) return NextResponse.json({ items: [] });

  const items = await listShortlist(session.user.id);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = shortlistItemSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid shortlist item" }, { status: 400 });

  await addShortlistItem(session.user.id, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = shortlistRemoveSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await removeShortlistItems(session.user.id, parsed.data.itemIds);
  return NextResponse.json({ ok: true });
}
