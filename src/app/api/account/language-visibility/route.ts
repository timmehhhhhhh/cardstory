import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";

const patchSchema = z.object({ languages: z.array(z.string()) });

/**
 * Sets the signed-in user's visible-card-languages filter (see the
 * visibleLanguages comment on the User model in prisma/schema.prisma) — an
 * empty array means "no restriction, show every language". Same shape as
 * pricing-visibility's route: writes the DB row only, the client still has
 * to call session.update({ visibleLanguages }) itself since a session JWT
 * can't be mutated from a server route.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await db.user.update({
    where: { id: session.user.id },
    data: { visibleLanguages: parsed.data.languages },
  });
  await logActivity(session.user.id, {
    action: "settings.language-visibility",
    entityType: "settings",
    summary:
      parsed.data.languages.length > 0
        ? `Set visible card languages to ${parsed.data.languages.join(", ")}`
        : "Reset visible card languages to all",
  });
  return NextResponse.json({ ok: true });
}
