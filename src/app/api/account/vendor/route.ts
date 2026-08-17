import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";

const patchSchema = z.object({ isVendor: z.boolean() });

/**
 * Toggles the signed-in user's self-designated vendor status (see the
 * isVendor comment on the User model in prisma/schema.prisma). The client
 * still has to call session.update({ isVendor }) itself after this
 * succeeds — this endpoint only writes the database row, since a session
 * JWT can't be mutated from a server route.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await db.user.update({
    where: { id: session.user.id },
    data: { isVendor: parsed.data.isVendor },
  });
  await logActivity(session.user.id, {
    action: parsed.data.isVendor ? "vendor.enabled" : "vendor.disabled",
    entityType: "vendor",
    summary: parsed.data.isVendor ? "Turned on Vendor account" : "Turned off Vendor account",
  });
  return NextResponse.json({ ok: true });
}
