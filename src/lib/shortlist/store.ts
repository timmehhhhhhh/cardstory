"use client";

import { useSession } from "next-auth/react";
import { useRemoteShortlistStore } from "@/lib/shortlist/remote-store";
import type { ShortlistState } from "@/lib/shortlist/types";

export type { ShortlistState } from "@/lib/shortlist/types";

/**
 * The single shortlist store every component reads from — same
 * pass-through shape as src/lib/pc/store.ts. Every route now requires a
 * signed-in session (see src/proxy.ts), so this is a direct pass-through
 * to useRemoteShortlistStore; `enabled` stays a defensive no-op for the
 * brief moment a session is still resolving on first paint, rather than
 * firing requests that are guaranteed to 401.
 */
export function useShortlistStore<T>(selector: (s: ShortlistState) => T): T {
  const { status } = useSession();
  return useRemoteShortlistStore(selector, { enabled: status === "authenticated" });
}
