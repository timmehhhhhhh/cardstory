import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listBinders, createBinder, ensureDefaultBinder, getPreferences } from "@/lib/binder/manage";
import { createBinderSchema } from "@/lib/binder/api-schemas";
import { isStaleSessionUserError, staleSessionResponse } from "@/lib/binder/route-errors";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Same end-to-end try/catch as GET /api/pc — a Prisma-Client/live-schema
  // mismatch (e.g. this migration deployed but never applied) would
  // otherwise be a bare, unlogged 500 that looks like every binder vanished.
  try {
    let binders = await listBinders(session.user.id);
    if (binders.length === 0) {
      await ensureDefaultBinder(session.user.id);
      binders = await listBinders(session.user.id);
    }
    const preferences = await getPreferences(session.user.id);
    return NextResponse.json({ binders, preferences });
  } catch (err) {
    if (isStaleSessionUserError(err)) {
      console.error("[GET /api/binder] stale session (userId has no users row)", { userId: session.user.id });
      return staleSessionResponse();
    }
    console.error("[GET /api/binder] failed to load binders", { userId: session.user.id }, err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createBinderSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid binder" }, { status: 400 });

  try {
    await createBinder(session.user.id, parsed.data);
  } catch (err) {
    if (isStaleSessionUserError(err)) {
      console.error("[POST /api/binder] stale session (userId has no users row)", { userId: session.user.id });
      return staleSessionResponse();
    }
    console.error("[POST /api/binder] failed to create binder", { userId: session.user.id }, err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
