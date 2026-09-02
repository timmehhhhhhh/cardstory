import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { setPreferences } from "@/lib/binder/manage";
import { patchBinderPreferencesSchema } from "@/lib/binder/api-schemas";
import { isStaleSessionUserError, staleSessionResponse } from "@/lib/binder/route-errors";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchBinderPreferencesSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });

  try {
    await setPreferences(session.user.id, parsed.data);
  } catch (err) {
    if (isStaleSessionUserError(err)) {
      console.error("[PATCH /api/binder/preferences] stale session (userId has no users row)", {
        userId: session.user.id,
      });
      return staleSessionResponse();
    }
    console.error("[PATCH /api/binder/preferences] failed", { userId: session.user.id }, err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
