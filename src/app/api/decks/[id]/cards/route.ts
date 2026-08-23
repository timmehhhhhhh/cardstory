import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { addCard } from "@/lib/deck-crafting/manage";
import { deckMutationErrorResponse } from "@/lib/deck-crafting/route-errors";

const addCardSchema = z.object({
  section: z.string().min(1),
  catalogItemId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = addCardSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid card" }, { status: 400 });

  try {
    await addCard(session.user.id, id, parsed.data.section, parsed.data.catalogItemId, parsed.data.quantity);
  } catch (err) {
    return deckMutationErrorResponse(err, { route: "POST /api/decks/[id]/cards", userId: session.user.id, deckId: id });
  }
  return NextResponse.json({ ok: true });
}
