"use client";

import { useSession } from "next-auth/react";
import { useRemotePCStore } from "@/lib/pc/remote-store";
import type { PCState } from "@/lib/pc/types";

export type { PCState } from "@/lib/pc/types";

/**
 * The single pc store every component in the app reads from — unchanged
 * import path and selector calling convention from before accounts existed.
 * Used to switch between a localStorage-backed guest store and this
 * server-backed one; now that an account is required to use the app at all
 * (see src/middleware.ts), every render is signed-in, so this is a thin
 * pass-through to useRemotePCStore. `enabled` stays gated on `authenticated`
 * rather than always-on as a defensive no-op for the brief moment a
 * session is still resolving on first client paint — the middleware
 * guarantees it resolves to authenticated shortly after.
 */
export function usePCStore<T>(selector: (s: PCState) => T): T {
  const { status } = useSession();
  return useRemotePCStore(selector, { enabled: status === "authenticated" });
}

/** Alias — preferences live on the same store; separate name keeps call sites readable. */
export const usePreferencesStore = usePCStore;
