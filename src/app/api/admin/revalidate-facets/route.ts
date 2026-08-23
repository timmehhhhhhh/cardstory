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
  // "max" = stale-while-revalidate: marks the tag stale now, next visit to
  // an Explore page refetches in the background. This Next.js's revalidateTag
  // requires the profile arg — the old expire-immediately single-arg form is
  // deprecated (see node_modules/next/dist/docs/.../revalidateTag.md).
  revalidateTag("catalog-facets", "max");
  return NextResponse.json({ revalidated: "catalog-facets", at: new Date().toISOString() });
}
