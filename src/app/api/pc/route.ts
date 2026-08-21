import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { listPCs, createPC, ensureDefaultPC } from "@/lib/pc/manage";
import { isStaleSessionUserError, staleSessionResponse } from "@/lib/pc/route-errors";

const createSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  kind: z.enum(["personal", "business"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let pcs = await listPCs(session.user.id);
  if (pcs.length === 0) {
    // ensureDefaultPC inserts a portfolio row referencing session.user.id —
    // if that id has no matching `users` row (a stale/cached session
    // cookie, e.g. from before a dev DB reset), this throws Prisma's
    // FK-violation error instead of creating anything. Left unhandled that
    // was an opaque 500 that made the account look like it had lost all
    // its data. See route-errors.ts for why this is a 401, not a 500.
    try {
      await ensureDefaultPC(session.user.id);
    } catch (err) {
      if (isStaleSessionUserError(err)) {
        console.error("[GET /api/pc] stale session (userId has no users row)", {
          userId: session.user.id,
        });
        return staleSessionResponse();
      }
      throw err;
    }
    pcs = await listPCs(session.user.id);
  }
  return NextResponse.json({ pcs });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid PC" }, { status: 400 });
  }

  try {
    await createPC(session.user.id, parsed.data.id, parsed.data.name, parsed.data.kind);
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
