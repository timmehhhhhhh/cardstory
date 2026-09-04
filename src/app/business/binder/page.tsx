import type { Metadata } from "next";
import { BusinessBinderClient } from "@/app/business/binder/_components/business-binder-client";
import { requireSession } from "@/lib/auth/require-session";
import { parseBinderJumpParams } from "@/lib/binder/placement";

export const metadata: Metadata = { title: "Business Binder Planner" };

/** See /binder/page.tsx's matching comment — same "Filed" trace deep link, for Business Inventory's binder. */
export default async function BusinessBinderPage({
  searchParams,
}: {
  searchParams: Promise<{ binderId?: string; pageId?: string; slotIndex?: string }>;
}) {
  await requireSession();
  const initialJump = parseBinderJumpParams(await searchParams);
  return <BusinessBinderClient initialJump={initialJump} />;
}
