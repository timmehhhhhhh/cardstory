import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { importLocalPC } from "@/lib/pc/manage";
import { pcSchema } from "@/lib/pc/api-schemas";

const bodySchema = z.object({ pcs: z.array(pcSchema).max(50) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid import payload" }, { status: 400 });

  await importLocalPC(session.user.id, parsed.data.pcs);
  return NextResponse.json({ ok: true });
}
