import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { curatedSetFiltersSchema } from "@/lib/curated-sets/api-schemas";
import { resolveCuratedSetMatches, resolveCuratedSetSpeciesMatches } from "@/lib/catalog/search";

/**
 * Live "≈N cards match" preview for the Curated Set builder, called on
 * every filter change before the set is saved — returns just a count (and
 * the truncation flag), never the item payload resolveCuratedSetMatches'
 * `items` would carry, since the builder only needs a number.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { filters?: unknown } | null;
  const parsed = curatedSetFiltersSchema.safeParse(body?.filters);
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400 });

  const { items, truncated } = parsed.data.groupByNationalPokedexNumber
    ? await resolveCuratedSetSpeciesMatches(parsed.data)
    : await resolveCuratedSetMatches(parsed.data);
  return NextResponse.json({ total: items.length, truncated });
}
