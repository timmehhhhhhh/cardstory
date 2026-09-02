import { NextRequest, NextResponse } from "next/server";
import { runPokemonSetLogoBackfillChunk } from "@/lib/automation/pokemon/set-logo-crawl";
import { isImageAutomationEnabled } from "@/lib/automation/enabled";

// Same headroom reasoning as pokemon-image-backfill's route.
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

  const summary = await runPokemonSetLogoBackfillChunk();
  return NextResponse.json({ ranAt: new Date().toISOString(), summary });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
