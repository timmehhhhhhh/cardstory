import { NextRequest, NextResponse } from "next/server";
import { runCatalogSync } from "@/lib/automation/pokemon/catalog-sync";
import { isImageAutomationEnabled } from "@/lib/automation/enabled";

// Real per-set card fetches can run long; give the route more headroom than
// the 10s Hobby default where supported — same reasoning as
// src/app/api/cron/snapshot-prices/route.ts.
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

  // Bounded so a big new-set wave spreads across several nightly runs — see
  // src/lib/automation/pokemon/catalog-sync.ts's header comment.
  const summary = await runCatalogSync({ gameIds: ["pokemon"], maxSetsPerRun: 10 });
  return NextResponse.json({ ranAt: new Date().toISOString(), summary });
}

// Cloudflare Cron Triggers (via workers/cron-image-automation) POST; accept
// GET too for manual testing, same convention as snapshot-prices.
export async function GET(req: NextRequest) {
  return POST(req);
}
