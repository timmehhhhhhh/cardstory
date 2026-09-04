import type { Metadata } from "next";
import { BinderClient } from "@/app/binder/_components/binder-client";
import { requireSession } from "@/lib/auth/require-session";
import { parseBinderJumpParams } from "@/lib/binder/placement";

export const metadata: Metadata = { title: "Binder Planner" };

/**
 * `?binderId=&pageId=&slotIndex=` (parseBinderJumpParams) is how a "Filed"
 * trace click from the PC page (see findLiveBinderPlacements) lands here on
 * the exact pocket a card was placed in — see BinderClient's `initialJump`
 * prop for how it's consumed once on load.
 */
export default async function BinderPage({
  searchParams,
}: {
  searchParams: Promise<{ binderId?: string; pageId?: string; slotIndex?: string }>;
}) {
  await requireSession();
  const initialJump = parseBinderJumpParams(await searchParams);
  return <BinderClient initialJump={initialJump} />;
}
