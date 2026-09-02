import { NextResponse } from "next/server";
export { isStaleSessionUserError, staleSessionResponse } from "@/lib/pc/route-errors";
import { isStaleSessionUserError, staleSessionResponse } from "@/lib/pc/route-errors";

/**
 * Shared `try { mutate() } catch { ... }` handling for every ownership-
 * checked Binder/BinderPage mutation route (src/app/api/binder/**) — same
 * shape as src/lib/pc/route-errors.ts's mutationErrorResponse, just keyed
 * to manage.ts's "Binder not found"/"Page not found" ownership-check
 * errors instead of PC's.
 */
export function mutationErrorResponse(
  err: unknown,
  context: { route: string; userId: string; [key: string]: unknown }
): NextResponse {
  const isNotFound =
    err instanceof Error && (err.message === "Binder not found" || err.message === "Page not found");

  if (isStaleSessionUserError(err)) {
    console.error(`[${context.route}] stale session (userId has no users row)`, context, err);
    return staleSessionResponse();
  }

  console.error(`[${context.route}] mutation failed`, context, err);

  return isNotFound
    ? NextResponse.json({ error: (err as Error).message }, { status: 404 })
    : NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
