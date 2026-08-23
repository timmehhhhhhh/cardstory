import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { reorderDecks } from "@/lib/deck-crafting/manage";

const reorderSchema = z.object({ orderedIds: z.array(z.string()).min(1) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = reorderSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await reorderDecks(session.user.id, parsed.data.orderedIds);
  return NextResponse.json({ ok: true });
}
