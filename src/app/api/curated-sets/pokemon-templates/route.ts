import { NextResponse } from "next/server";
import { POKEMON_CURATED_COLLECTION_TEMPLATES } from "@/lib/games/pokemon/curated-collections";

export interface PokemonCuratedTemplateOption {
  id: string;
  label: string;
  description: string;
  dexNumbers: number[];
}

/**
 * Server-computed metadata for the Curated Sets builder's Pokémon quick-
 * start templates (Living Dex/Eeveelutions/All Starters). Served from a
 * route rather than imported straight into the (client) builder component
 * so POKEMON_SPECIES_NAMES — a ~1000-entry generated table — never has to
 * ship in the client bundle just to compute Living Dex's length.
 */
export async function GET() {
  const templates: PokemonCuratedTemplateOption[] = POKEMON_CURATED_COLLECTION_TEMPLATES.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    dexNumbers: t.dexNumbers(),
  }));
  return NextResponse.json(
    { templates },
    // Changes only when a new template is shipped or a new generation's
    // species table lands — same long, side-effect-free cache as the other
    // catalog facet routes (see api/catalog/card-types/route.ts).
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
