"use client";

import { useSession } from "next-auth/react";
import { useRemotePCStore } from "@/lib/pc/remote-store";
import type { PCState } from "@/lib/pc/types";

export type { PCState } from "@/lib/pc/types";

/**
 * The single pc store every component in the app reads from — unchanged
 * import path and selector calling convention from before accounts
 * existed, so none of the ~19 consuming components need to change. Every
 * route now requires a signed-in session (see src/proxy.ts), so this is a
 * direct pass-through to useRemotePCStore; `enabled` stays a defensive
 * no-op for the brief moment a session is still resolving on first paint,
 * rather than firing requests that are guaranteed to 401.
 */
export function usePCStore<T>(selector: (s: PCState) => T): T {
  const { status } = useSession();
  return useRemotePCStore(selector, { enabled: status === "authenticated" });
}

/** Alias — preferences live on the same store; separate name keeps call sites readable. */
export const usePreferencesStore = usePCStore;
