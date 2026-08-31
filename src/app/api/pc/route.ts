import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { listPCs, createPC, ensureDefaultPC, ensureBusinessPC } from "@/lib/pc/manage";
import { isStaleSessionUserError, staleSessionResponse } from "@/lib/pc/route-errors";

const createSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  kind: z.enum(["personal", "business"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Wrapped end-to-end (not just around ensureDefaultPC below) — a schema
  // mismatch between the deployed Prisma Client and the live DB (e.g. a
  // migration that was never actually applied to prod — see README's
  // "Deploying" section) makes `listPCs`'s `include: { holdings: true }`
  // throw a plain Postgres "column does not exist" error. Left unhandled
  // that was a bare, unlogged 500 that made every signed-in user's PC look
  // wiped (see the 2026-08-26 PC-cards-missing incident) with nothing in
  // the logs to point at the real cause.
  try {
    let pcs = await listPCs(session.user.id);
    if (pcs.length === 0) {
      // ensureDefaultPC inserts a portfolio row referencing session.user.id —
      // if that id has no matching `users` row (a stale/cached session
      // cookie, e.g. from before a dev DB reset), this throws Prisma's
      // FK-violation error instead of creating anything. Left unhandled that
      // was an opaque 500 that made the account look like it had lost all
      // its data. See route-errors.ts for why this is a 401, not a 500.
      await ensureDefaultPC(session.user.id);
      pcs = await listPCs(session.user.id);
    }
    return NextResponse.json({ pcs });
  } catch (err) {
    if (isStaleSessionUserError(err)) {
      console.error("[GET /api/pc] stale session (userId has no users row)", {
        userId: session.user.id,
      });
      return staleSessionResponse();
    }
    console.error("[GET /api/pc] failed to load pcs", { userId: session.user.id }, err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid PC" }, { status: 400 });
  }

  try {
    // "business" is a singleton per user — route it through the same
    // find-or-create-with-deterministic-id path as ensureDefaultPC instead
    // of a plain insert, so racing calls (see ensureBusinessPC's doc
    // comment) can't each create their own duplicate "Business Inventory"
    // row. The client-supplied id/name are ignored for this case; the
    // server is the source of truth for "does this user already have one."
    if (parsed.data.kind === "business") {
      await ensureBusinessPC(session.user.id);
    } else {
      await createPC(session.user.id, parsed.data.id, parsed.data.name, parsed.data.kind);
    }
  } catch (err) {
    if (isStaleSessionUserError(err)) {
      console.error("[POST /api/pc] stale session (userId has no users row)", {
        userId: session.user.id,
      });
      return staleSessionResponse();
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
