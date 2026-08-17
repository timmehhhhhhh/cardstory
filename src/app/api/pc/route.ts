import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { listPCs, createPC, ensureDefaultPC } from "@/lib/pc/manage";

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
    await ensureDefaultPC(session.user.id);
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

  await createPC(session.user.id, parsed.data.id, parsed.data.name, parsed.data.kind);
  return NextResponse.json({ ok: true });
}
