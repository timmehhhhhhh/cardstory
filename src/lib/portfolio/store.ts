"use client";

import { useSession } from "next-auth/react";
import { useLocalPortfolioStore, type PortfolioState } from "@/lib/portfolio/local-store";
import { useRemotePortfolioStore } from "@/lib/portfolio/remote-store";

export type { PortfolioState } from "@/lib/portfolio/local-store";

/**
 * The single portfolio store every component in the app reads from —
 * unchanged import path and selector calling convention from before
 * accounts existed, so none of the ~19 consuming components needed to
 * change. Logged-out visitors are served entirely from localStorage
 * (useLocalPortfolioStore, untouched); signed-in users are served from the
 * server (useRemotePortfolioStore). See remote-store.ts for what does and
 * doesn't move server-side (preferences/watchlist stay local either way).
 *
 * Both hooks are always called (React hook rules — no conditional hook
 * calls), and the unused one's query stays disabled via `enabled`.
 */
export function usePortfolioStore<T>(selector: (s: PortfolioState) => T): T {
  const { status } = useSession();
  const authed = status === "authenticated";

  const local = useLocalPortfolioStore(selector);
  // While the session is still resolving on first paint, fall back to
  // local rather than flashing empty server state.
  const remote = useRemotePortfolioStore(selector, { enabled: authed });

  return authed ? remote : local;
}

/** Alias — preferences live on the same store; separate name keeps call sites readable. */
export const usePreferencesStore = usePortfolioStore;
