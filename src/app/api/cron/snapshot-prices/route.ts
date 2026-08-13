import { NextRequest, NextResponse } from "next/server";
import { runDailySnapshot } from "@/lib/pricing/run-daily-snapshot";
import { runSportsCardSnapshot } from "@/lib/pricing/run-sports-card-snapshot";

// Real per-set card fetches (esp. MTG's bulk pagination) can run long;
// give the route more headroom than the 10s Hobby default where supported.
export const maxDuration = 120;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runDailySnapshot();
  const sportsCards = await runSportsCardSnapshot();
  return NextResponse.json({ ranAt: new Date().toISOString(), results, sportsCards });
}

// Vercel Cron sends GET requests by default; accept either.
export async function GET(req: NextRequest) {
  return POST(req);
}
