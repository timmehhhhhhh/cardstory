import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

/**
 * Forces Explore's catalog-facet caches (card types, rarities, domains,
 * variants — see the shared "catalog-facets" tag in lib/catalog/search.ts)
 * to recompute on next read, instead of waiting out their 24h
 * `revalidate: 86400`.
 *
 * Needed because those are `unstable_cache`d server-side reads, tied to the
 * running Next.js process — `revalidateTag` only works from inside a Next
 * request, so a one-off migration script (e.g.
 * scripts/apply-cosmos-holo-variant.ts) can't call it directly. Hit this
 * route once after any script that changes a facet-driving column
 * (CatalogItem.variantKey/rarity/cardType/domain) outside the normal
 * seed-catalog.ts path.
 *
 * Reuses CRON_SECRET (see api/cron/snapshot-prices) rather than a new env
 * var — same "only someone holding a server secret can trigger this"
 * posture, no extra deploy config needed.
 */
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
  // Deliberately NOT `"max"` (stale-while-revalidate): on this Cloudflare
  // Workers deployment, the "revalidate in the background after responding"
  // continuation gets killed by the runtime once the triggering request
  // completes — confirmed live via `wrangler tail`:
  //   "A promise was resolved ... from a different request context ...
  //    Continuations for that request are unlikely to run safely and have
  //    been canceled."
  // So with "max" the tag gets marked stale but the actual re-fetch from
  // Postgres never happens — every subsequent read just keeps re-serving
  // the old cached value forever. `{ expire: 0 }` instead makes the *next*
  // read block and refetch synchronously, inside its own request, which
  // isn't subject to that cross-request-continuation cancellation.
  revalidateTag("catalog-facets", { expire: 0 });
  return NextResponse.json({ revalidated: "catalog-facets", at: new Date().toISOString() });
}
