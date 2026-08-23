import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { archiveHoldings } from "@/lib/pc/manage";
import { archiveHoldingsSchema } from "@/lib/pc/api-schemas";
import { mutationErrorResponse } from "@/lib/pc/route-errors";

/**
 * Soft-deletes holdings out of a PC into PC Archives / Business Archives —
 * the everyday "remove a card" path. See src/lib/pc/manage.ts's
 * archiveHoldings for what this preserves; DELETE /api/pc/[id]/holdings
 * (hard delete) is reserved for "delete forever" from within Archives.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = archiveHoldingsSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    await archiveHoldings(session.user.id, parsed.data.pcId, parsed.data.holdingIds, parsed.data.letGo);
  } catch (err) {
    return mutationErrorResponse(err, {
      route: "POST /api/pc/holdings/archive",
      userId: session.user.id,
      pcId: parsed.data.pcId,
      holdingIds: parsed.data.holdingIds,
    });
  }
  return NextResponse.json({ ok: true });
}
