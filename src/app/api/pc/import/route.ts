import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { importLocalPC } from "@/lib/pc/manage";
import { pcSchema } from "@/lib/pc/api-schemas";
import { addWatchlistEntry } from "@/lib/pc/watchlist-manage";
import { watchlistAddSchema } from "@/lib/pc/watchlist-schemas";

const bodySchema = z.object({
  pcs: z.array(pcSchema).max(50),
  watchlist: z.array(watchlistAddSchema).max(500).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid import payload" }, { status: 400 });

  await importLocalPC(session.user.id, parsed.data.pcs);

  // Upserts (see addWatchlistEntry) so re-running the import prompt is
  // safe — same idempotency story importLocalPC's holdings upsert has.
  for (const entry of parsed.data.watchlist ?? []) {
    await addWatchlistEntry(session.user.id, entry.itemId, entry.kind, entry.priceAtAdd ?? null);
  }

  return NextResponse.json({ ok: true });
}
