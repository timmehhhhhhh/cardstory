"use client";

import { useSession } from "next-auth/react";
import { useLocalShortlistStore, type ShortlistState } from "@/lib/shortlist/local-store";
import { useRemoteShortlistStore } from "@/lib/shortlist/remote-store";

export type { ShortlistState } from "@/lib/shortlist/local-store";

/**
 * The single shortlist store every component reads from — same
 * useSession()-based switcher as src/lib/pc/store.ts. Logged-out visitors
 * are served entirely from localStorage; signed-in users are served from
 * the server. Both hooks are always called (React hook rules — no
 * conditional hook calls); the unused one's query stays disabled via
 * `enabled`.
 */
export function useShortlistStore<T>(selector: (s: ShortlistState) => T): T {
  const { status } = useSession();
  const authed = status === "authenticated";

  const local = useLocalShortlistStore(selector);
  const remote = useRemoteShortlistStore(selector, { enabled: authed });

  return authed ? remote : local;
}
