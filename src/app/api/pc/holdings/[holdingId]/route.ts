import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateHolding } from "@/lib/pc/manage";
import { holdingPatchSchema } from "@/lib/pc/api-schemas";
import { mutationErrorResponse } from "@/lib/pc/route-errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ holdingId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { holdingId } = await params;
  const parsed = holdingPatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid patch" }, { status: 400 });

  try {
    await updateHolding(session.user.id, holdingId, parsed.data);
  } catch (err) {
    return mutationErrorResponse(err, {
      route: "PATCH /api/pc/holdings/[holdingId]",
      userId: session.user.id,
      holdingId,
    });
  }
  return NextResponse.json({ ok: true });
}
