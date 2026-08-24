"use client";

import { useSession } from "next-auth/react";

/**
 * App-wide "hide pricing" display preference, toggled from
 * src/app/settings/_components/settings-client.tsx and persisted on the
 * User row (session.user.hidePricing — see src/auth.config.ts). Returns
 * true (pricing visible) when there's no session, so logged-out surfaces
 * like the public showcase page are unaffected.
 */
export function usePricingVisible(): boolean {
  const { data: session } = useSession();
  return !(session?.user?.hidePricing ?? false);
}
