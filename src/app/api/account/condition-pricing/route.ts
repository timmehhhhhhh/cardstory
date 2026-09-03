import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getConditionPricing, setConditionPricing } from "@/lib/condition-pricing/manage";
import { conditionPricingSchema } from "@/lib/condition-pricing/api-schemas";

/**
 * The signed-in user's condition -> percentage-of-market map (see the
 * conditionPricing comment on the User model in prisma/schema.prisma).
 *
 * Deliberately NOT mirrored into the session JWT the way hidePricing is
 * (src/app/api/account/pricing-visibility/route.ts): hidePricing is read by
 * practically every component that renders money and has to be available
 * synchronously everywhere, while this is read by exactly two surfaces —
 * /settings and /shortlist — both of which are already inside
 * QueryClientProvider. A plain GET + useQuery keeps it out of
 * src/auth.config.ts, src/auth.ts and src/types/next-auth.d.ts entirely.
 *
 * Also deliberately not logged to the History feed: nudging five percentage
 * boxes is display-preference churn, not an account event.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pricing = await getConditionPricing(session.user.id);
  return NextResponse.json({ pricing });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = conditionPricingSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await setConditionPricing(session.user.id, parsed.data);
  return NextResponse.json({ ok: true, pricing: parsed.data });
}
