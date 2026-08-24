import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";

const patchSchema = z.object({ hidePricing: z.boolean() });

/**
 * Toggles the signed-in user's app-wide "hide pricing" display preference
 * (see the hidePricing comment on the User model in prisma/schema.prisma).
 * The client still has to call session.update({ hidePricing }) itself after
 * this succeeds — this endpoint only writes the database row, since a
 * session JWT can't be mutated from a server route.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await db.user.update({
    where: { id: session.user.id },
    data: { hidePricing: parsed.data.hidePricing },
  });
  await logActivity(session.user.id, {
    action: parsed.data.hidePricing ? "pricing.hidden" : "pricing.shown",
    entityType: "settings",
    summary: parsed.data.hidePricing
      ? "Turned on Hide pricing & values"
      : "Turned off Hide pricing & values",
  });
  return NextResponse.json({ ok: true });
}
