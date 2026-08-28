import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addHoldingsBatch } from "@/lib/pc/manage";
import { batchHoldingsSchema } from "@/lib/pc/api-schemas";
import { mutationErrorResponse } from "@/lib/pc/route-errors";

/**
 * Batch commit for the Mass Card Scanner's "Add N cards" step — the one
 * request-level counterpart to POST /api/pc/[id]/holdings (which stays
 * single-holding, used everywhere else in the app). Always returns 200 with
 * a per-item `results` array once the batch itself is validated and the PC
 * ownership check passes; a whole-request failure (bad body, no session,
 * ownership mismatch) still short-circuits with the usual 400/401/404 —
 * see addHoldingsBatch in manage.ts for why individual item failures don't
 * escalate to a request-level error.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = batchHoldingsSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid batch" }, { status: 400 });

  try {
    const results = await addHoldingsBatch(session.user.id, id, parsed.data.items);
    return NextResponse.json({ results });
  } catch (err) {
    return mutationErrorResponse(err, {
      route: "POST /api/pc/[id]/holdings/batch",
      userId: session.user.id,
      pcId: id,
      itemCount: parsed.data.items.length,
    });
  }
}
