import { NextRequest, NextResponse } from "next/server";
import { CATALOG_SORTS, searchCatalog, type CatalogSort } from "@/lib/catalog/search";

function parseIds(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const ids = value.split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const sortParam = sp.get("sort") ?? "best_match";
  const sort: CatalogSort = (CATALOG_SORTS as readonly string[]).includes(sortParam)
    ? (sortParam as CatalogSort)
    : "best_match";

  const productTypeParam = sp.get("type");
  const productType =
    productTypeParam === "CARD" || productTypeParam === "SEALED" ? productTypeParam : undefined;

  const result = await searchCatalog({
    q: sp.get("q") ?? undefined,
    gameId: sp.get("game") ?? undefined,
    setId: sp.get("set") ?? undefined,
    productType,
    onlyIds: parseIds(sp.get("onlyIds")),
    excludeIds: parseIds(sp.get("excludeIds")),
    sort,
    page: sp.get("page") ? Number(sp.get("page")) : undefined,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : undefined,
  });

  return NextResponse.json(result);
}
