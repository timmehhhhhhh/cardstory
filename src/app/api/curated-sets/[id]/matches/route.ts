import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCuratedSet } from "@/lib/curated-sets/manage";
import { resolveCuratedSetMatches } from "@/lib/catalog/search";

/**
 * The full (non-paginated) set of catalog items a curated set's filters
 * currently match — used by both the list page (to compute progress) and
 * the detail page (to render the owned/missing grids). Reads filters from
 * the stored, ownership-checked CuratedSet rather than trusting a client-
 * supplied filter payload, so there's one source of truth for what a given
 * curated set's id means.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let curatedSet;
  try {
    curatedSet = await getCuratedSet(session.user.id, id);
  } catch {
    return NextResponse.json({ error: "Curated set not found" }, { status: 404 });
  }

  const { items, truncated } = await resolveCuratedSetMatches(curatedSet.filters);
  return NextResponse.json({ items, truncated });
}
