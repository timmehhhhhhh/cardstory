import { NextRequest, NextResponse } from "next/server";
import { runSportsImageBackfillChunk, isSportsImageScrapeEnabled } from "@/lib/automation/sports/image-scrape";

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

  // Off by default — see src/lib/automation/sports/image-scrape.ts's header.
  // Returning 200 here (not a failure) is deliberate: a disabled leg isn't a
  // cron error, it's the expected steady state until a human turns it on.
  if (!isSportsImageScrapeEnabled()) {
    return NextResponse.json({ skipped: true, ranAt: new Date().toISOString() });
  }

  const summary = await runSportsImageBackfillChunk();
  return NextResponse.json({ ranAt: new Date().toISOString(), summary });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
