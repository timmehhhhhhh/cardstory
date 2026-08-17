import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addWatchlistEntry, listWatchlist, removeWatchlistEntry } from "@/lib/pc/watchlist-manage";
import { watchlistAddSchema, watchlistRemoveSchema } from "@/lib/pc/watchlist-schemas";

export async function GET() {
  const session = await auth();
  // Anonymous stays local-only (see src/lib/pc/local-store.ts) — an empty
  // list is a safe default here, no 401, since this is a read not a mutation.
  if (!session?.user) return NextResponse.json({ entries: [] });

  const entries = await listWatchlist(session.user.id);
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = watchlistAddSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid entry" }, { status: 400 });

  await addWatchlistEntry(session.user.id, parsed.data.itemId, parsed.data.kind, parsed.data.priceAtAdd ?? null);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = watchlistRemoveSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await removeWatchlistEntry(session.user.id, parsed.data.itemId);
  return NextResponse.json({ ok: true });
}
