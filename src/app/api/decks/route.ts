import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { listDecks, createDeck } from "@/lib/deck-crafting/manage";
import { deckMutationErrorResponse } from "@/lib/deck-crafting/route-errors";

const createSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  gameId: z.string().min(1),
  formatId: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decks = await listDecks(session.user.id);
  return NextResponse.json({ decks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid deck" }, { status: 400 });

  try {
    await createDeck(session.user.id, parsed.data.id, parsed.data.name, parsed.data.gameId, parsed.data.formatId);
  } catch (err) {
    return deckMutationErrorResponse(err, { route: "POST /api/decks", userId: session.user.id });
  }
  return NextResponse.json({ ok: true });
}
