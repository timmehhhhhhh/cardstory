"use client";

import { useSession } from "next-auth/react";
import { useLocalPCStore, type PCState } from "@/lib/pc/local-store";
import { useRemotePCStore } from "@/lib/pc/remote-store";

export type { PCState } from "@/lib/pc/local-store";

/**
 * The single pc store every component in the app reads from —
 * unchanged import path and selector calling convention from before
 * accounts existed, so none of the ~19 consuming components needed to
 * change. Logged-out visitors are served entirely from localStorage
 * (useLocalPCStore, untouched); signed-in users are served from the
 * server (useRemotePCStore). See remote-store.ts for what does and
 * doesn't move server-side (preferences/watchlist stay local either way).
 *
 * Both hooks are always called (React hook rules — no conditional hook
 * calls), and the unused one's query stays disabled via `enabled`.
 */
export function usePCStore<T>(selector: (s: PCState) => T): T {
  const { status } = useSession();
  const authed = status === "authenticated";

  const local = useLocalPCStore(selector);
  // While the session is still resolving on first paint, fall back to
  // local rather than flashing empty server state.
  const remote = useRemotePCStore(selector, { enabled: authed });

  return authed ? remote : local;
}

/** Alias — preferences live on the same store; separate name keeps call sites readable. */
export const usePreferencesStore = usePCStore;
