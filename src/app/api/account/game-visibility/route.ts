import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";

const patchSchema = z.object({ hiddenGameIds: z.array(z.string()) });

/**
 * Sets the signed-in user's hidden-games filter (see the hiddenGameIds
 * comment on the User model in prisma/schema.prisma) — stores what's
 * *hidden*, not what's visible, so a newly wired-up game defaults to
 * visible for every existing account. Same shape as pricing-visibility's
 * route: writes the DB row only, the client still has to call
 * session.update({ hiddenGameIds }) itself.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await db.user.update({
    where: { id: session.user.id },
    data: { hiddenGameIds: parsed.data.hiddenGameIds },
  });
  await logActivity(session.user.id, {
    action: "settings.game-visibility",
    entityType: "settings",
    summary:
      parsed.data.hiddenGameIds.length > 0
        ? `Hid ${parsed.data.hiddenGameIds.length} game(s) from browsing`
        : "Unhid all games",
  });
  return NextResponse.json({ ok: true });
}
