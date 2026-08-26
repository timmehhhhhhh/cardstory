import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addWatchlistEntry, listWatchlist, removeWatchlistEntry } from "@/lib/pc/watchlist-manage";
import { watchlistAddSchema, watchlistRemoveSchema } from "@/lib/pc/watchlist-schemas";

export async function GET() {
  const session = await auth();
  // Every route requires a signed-in session (see src/middleware.ts), so
  // session?.user should always be set here — an empty list is still a
  // safe fallback rather than a 401, since this is a read not a mutation.
  if (!session?.user) return NextResponse.json({ entries: [] });

  const entries = await listWatchlist(session.user.id);
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = watchlistAddSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid entry" }, { status: 400 });

  try {
    await addWatchlistEntry(session.user.id, parsed.data.itemId, parsed.data.kind, parsed.data.priceAtAdd ?? null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[watchlist] POST failed", err);
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = watchlistRemoveSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    await removeWatchlistEntry(session.user.id, parsed.data.itemId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[watchlist] DELETE failed", err);
    return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
  }
}
