import { NextRequest, NextResponse } from "next/server";
import { getCatalogItemsByIds } from "@/lib/catalog/by-ids";

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const items = await getCatalogItemsByIds(ids);
  return NextResponse.json({ items });
}
