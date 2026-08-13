import { NextRequest, NextResponse } from "next/server";
import { getSportsCardItemsByIds } from "@/lib/sportscards/manage";

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const items = await getSportsCardItemsByIds(ids);
  return NextResponse.json({ items });
}
