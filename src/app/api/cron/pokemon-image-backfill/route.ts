import { NextRequest, NextResponse } from "next/server";
import { runPokemonImageBackfillChunk } from "@/lib/automation/pokemon/image-crawl";
import { isImageAutomationEnabled } from "@/lib/automation/enabled";

// A bounded chunk against a real remote site can take ~60-90s at
// polite-fetch.ts's pacing — see src/lib/automation/pokemon/image-crawl.ts.
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
  if (!isImageAutomationEnabled()) {
    return NextResponse.json({ skipped: true, ranAt: new Date().toISOString() });
  }

  const summary = await runPokemonImageBackfillChunk();
  return NextResponse.json({ ranAt: new Date().toISOString(), summary });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
