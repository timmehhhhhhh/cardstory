import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { renameDeck, setDeckStatus, setDeckNotes, deleteDeck } from "@/lib/deck-crafting/manage";
import { deckMutationErrorResponse } from "@/lib/deck-crafting/route-errors";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  status: z.enum(["wip", "complete"]).optional(),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid patch" }, { status: 400 });

  try {
    if (parsed.data.name !== undefined) await renameDeck(session.user.id, id, parsed.data.name);
    if (parsed.data.status !== undefined) await setDeckStatus(session.user.id, id, parsed.data.status);
    if (parsed.data.notes !== undefined) await setDeckNotes(session.user.id, id, parsed.data.notes);
  } catch (err) {
    return deckMutationErrorResponse(err, { route: "PATCH /api/decks/[id]", userId: session.user.id, deckId: id });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deleteDeck(session.user.id, id);
  } catch (err) {
    return deckMutationErrorResponse(err, { route: "DELETE /api/decks/[id]", userId: session.user.id, deckId: id });
  }
  return NextResponse.json({ ok: true });
}
