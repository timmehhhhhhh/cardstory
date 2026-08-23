import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { updateCardQuantity, moveCardSection, removeCard } from "@/lib/deck-crafting/manage";
import { deckMutationErrorResponse } from "@/lib/deck-crafting/route-errors";

const patchSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  section: z.string().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid patch" }, { status: 400 });

  try {
    if (parsed.data.quantity !== undefined) await updateCardQuantity(session.user.id, cardId, parsed.data.quantity);
    if (parsed.data.section !== undefined) await moveCardSection(session.user.id, cardId, parsed.data.section);
  } catch (err) {
    return deckMutationErrorResponse(err, {
      route: "PATCH /api/decks/[id]/cards/[cardId]",
      userId: session.user.id,
      cardId,
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;
  try {
    await removeCard(session.user.id, cardId);
  } catch (err) {
    return deckMutationErrorResponse(err, {
      route: "DELETE /api/decks/[id]/cards/[cardId]",
      userId: session.user.id,
      cardId,
    });
  }
  return NextResponse.json({ ok: true });
}
