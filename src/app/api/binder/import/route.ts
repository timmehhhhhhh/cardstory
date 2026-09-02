import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { importLocalBinders } from "@/lib/binder/manage";
import { importBindersSchema } from "@/lib/binder/api-schemas";
import { isStaleSessionUserError, staleSessionResponse } from "@/lib/binder/route-errors";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = importBindersSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid import payload" }, { status: 400 });

  // importLocalBinders upserts with `create: { userId, ... }` — same stale-
  // session FK-violation risk as importLocalPC in src/app/api/pc/import/route.ts.
  try {
    await importLocalBinders(session.user.id, parsed.data.binders);
  } catch (err) {
    if (isStaleSessionUserError(err)) {
      console.error("[POST /api/binder/import] stale session (userId has no users row)", {
        userId: session.user.id,
      });
      return staleSessionResponse();
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
