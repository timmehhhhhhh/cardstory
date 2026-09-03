"use client";

import { useSession } from "next-auth/react";

/**
 * The signed-in user's hidden-games browsing filter, toggled from
 * src/app/settings/_components/settings-client.tsx and persisted on the
 * User row (session.user.hiddenGameIds — see src/auth.config.ts). Empty
 * (the default, and every logged-out surface) means "nothing hidden —
 * show every game".
 */
export function useHiddenGameIds(): string[] {
  const { data: session } = useSession();
  return session?.user?.hiddenGameIds ?? [];
}

/** True when `gameId` should show up while browsing — see useHiddenGameIds. */
export function useIsGameVisible(gameId: string): boolean {
  const hidden = useHiddenGameIds();
  return !hidden.includes(gameId);
}
