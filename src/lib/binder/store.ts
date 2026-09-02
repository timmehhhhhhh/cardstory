"use client";

import { useSession } from "next-auth/react";
import { useRemoteBinderStore } from "@/lib/binder/remote-store";
import type { BinderState } from "@/lib/binder/remote-store";

export type { BinderState, SetLayoutResult, PlaceCustomImageResult } from "@/lib/binder/remote-store";
export { getBindersSnapshot } from "@/lib/binder/remote-store";

/**
 * The single binder store every component reads from — unchanged import
 * path and selector calling convention from before this was server-backed
 * (see src/lib/binder/remote-store.ts), so the 3 consuming components
 * needed no logic changes, only this swap. Every route requires a
 * signed-in session (src/middleware.ts), so this is a direct pass-through
 * to useRemoteBinderStore; `enabled` stays a defensive no-op for the brief
 * moment a session is still resolving on first paint, rather than firing
 * requests guaranteed to 401. Mirrors src/lib/pc/store.ts exactly.
 */
export function useBinderStore<T>(selector: (s: BinderState) => T): T {
  const { status } = useSession();
  return useRemoteBinderStore(selector, { enabled: status === "authenticated" });
}
