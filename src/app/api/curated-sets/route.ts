import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listCuratedSets, createCuratedSet } from "@/lib/curated-sets/manage";
import { createCuratedSetSchema } from "@/lib/curated-sets/api-schemas";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const curatedSets = await listCuratedSets(session.user.id);
  return NextResponse.json({ curatedSets });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createCuratedSetSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid curated set" }, { status: 400 });
  }

  const curatedSet = await createCuratedSet(
    session.user.id,
    parsed.data.id,
    parsed.data.name,
    parsed.data.filters,
    parsed.data.targetQuantity
  );
  return NextResponse.json({ curatedSet }, { status: 201 });
}
