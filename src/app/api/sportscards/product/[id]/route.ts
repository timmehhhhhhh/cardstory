import { NextRequest, NextResponse } from "next/server";
import { getSportsCardProductById } from "@/lib/pricing/sportscardspro/client";
import { mapPriceChartingProduct } from "@/lib/pricing/pricecharting/mapper";
import { parseConsoleName, parseProductName } from "@/lib/sportscards/parse";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await getSportsCardProductById(id);
  if (!product) {
    return NextResponse.json({ found: false });
  }

  const { playerName, cardNumber, parallelName } = parseProductName(product["product-name"] ?? "");
  const { year, setName } = parseConsoleName(product["console-name"] ?? "");

  return NextResponse.json({
    found: true,
    priceChartingId: product.id,
    suggested: { playerName, cardNumber, parallelName, year, setName },
    values: mapPriceChartingProduct(product),
  });
}
