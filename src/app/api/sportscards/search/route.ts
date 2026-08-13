import { NextRequest, NextResponse } from "next/server";
import { getSportMeta } from "@/lib/sports/registry";
import { isSportsCardsProConfigured, searchSportsCardCandidates } from "@/lib/pricing/sportscardspro/client";

export async function GET(req: NextRequest) {
  if (!isSportsCardsProConfigured()) {
    return NextResponse.json({ available: false, candidates: [] });
  }

  const sp = req.nextUrl.searchParams;
  const sport = sp.get("sport") ?? "";
  const q = sp.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ available: true, candidates: [] });

  const sportLabel = getSportMeta(sport)?.searchLabel ?? "";
  const query = [q, sportLabel].filter(Boolean).join(" ");

  const candidates = await searchSportsCardCandidates(query);
  return NextResponse.json({
    available: true,
    candidates: candidates.map((c) => ({
      id: c.id,
      name: c["product-name"] ?? "",
      consoleName: c["console-name"] ?? "",
    })),
  });
}
