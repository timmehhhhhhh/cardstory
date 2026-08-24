import { NextResponse } from "next/server";
import { getSportsCardGroupVariants } from "@/lib/sportscards/manage";

/**
 * Every parallel/refractor of the given card (including the base version
 * itself), base first then rarity order — backs the add-to-collection
 * variant picker in AddHoldingDialog. See getSportsCardGroupVariants for the
 * grouping rule.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const variants = await getSportsCardGroupVariants(id);
  return NextResponse.json({ variants });
}
