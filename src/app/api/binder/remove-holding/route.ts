import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { removeHoldingEverywhere } from "@/lib/binder/manage";
import { isStaleSessionUserError, staleSessionResponse } from "@/lib/binder/route-errors";

const bodySchema = z.object({ holdingId: z.string().min(1) });

/** Called when a holding is deleted from the pc — nulls out every binder pocket across the user's binders that referenced it. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    await removeHoldingEverywhere(session.user.id, parsed.data.holdingId);
  } catch (err) {
    if (isStaleSessionUserError(err)) {
      console.error("[POST /api/binder/remove-holding] stale session (userId has no users row)", {
        userId: session.user.id,
      });
      return staleSessionResponse();
    }
    console.error("[POST /api/binder/remove-holding] failed", { userId: session.user.id }, err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
