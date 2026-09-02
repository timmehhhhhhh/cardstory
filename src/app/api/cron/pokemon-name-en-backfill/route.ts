import { NextRequest, NextResponse } from "next/server";
import { runNameEnBackfill } from "@/lib/automation/pokemon/name-en-backfill";
import { isImageAutomationEnabled } from "@/lib/automation/enabled";

// Cheapest leg — no network fetch, just DB reads/writes — so the default
// 10s budget would likely be enough, but matching the other cron routes'
// headroom keeps this consistent and safe against a larger chunk size later.
export const maxDuration = 60;

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

  const summary = await runNameEnBackfill({ chunkSize: 2000 });
  return NextResponse.json({ ranAt: new Date().toISOString(), summary });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
