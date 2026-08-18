import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listViews, createView } from "@/lib/views/manage";
import { createViewSchema } from "@/lib/views/api-schemas";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const views = await listViews(session.user.id);
  return NextResponse.json({ views });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createViewSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid view" }, { status: 400 });
  }

  const view = await createView(session.user.id, parsed.data.id, parsed.data.name, parsed.data.filters);
  return NextResponse.json({ view }, { status: 201 });
}
