"use client";

import { useSession } from "next-auth/react";

/**
 * The signed-in user's card-language browsing filter, toggled from
 * src/app/settings/_components/settings-client.tsx and persisted on the
 * User row (session.user.visibleLanguages — see src/auth.config.ts). An
 * empty array (the default, and every logged-out surface) means "no
 * restriction — show every language".
 */
export function useVisibleLanguages(): string[] {
  const { data: session } = useSession();
  return session?.user?.visibleLanguages ?? [];
}

/** True when `language` should show up while browsing — see useVisibleLanguages. */
export function useIsLanguageVisible(language: string): boolean {
  const visible = useVisibleLanguages();
  return visible.length === 0 || visible.includes(language);
}
