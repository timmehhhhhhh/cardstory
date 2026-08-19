import { NextResponse } from "next/server";

/**
 * Shared handling for the `try { mutate() } catch { ... }` pattern used by
 * every ownership-checked PC/holding mutation route (src/app/api/pc/**).
 * Before this, every route collapsed ANY thrown error — a genuine
 * ownership mismatch, a Prisma failure, an unrelated bug — into the same
 * generic, unlogged 404, which made a real failure indistinguishable from
 * "you don't own this" both to the caller and to us after the fact.
 *
 * manage.ts's assertOwnsPC/assertOwnsHolding throw a plain
 * Error("PC not found") / Error("Holding not found") for the expected
 * "you don't own this" case — that's the only case that should still read
 * as 404. Anything else is unexpected and now gets logged with enough
 * context to actually diagnose, and reported as a 500 instead of being
 * silently mislabeled as "not found."
 */
export function mutationErrorResponse(
  err: unknown,
  context: { route: string; userId: string; [key: string]: unknown }
): NextResponse {
  const isNotFound =
    err instanceof Error && (err.message === "PC not found" || err.message === "Holding not found");

  console.error(`[${context.route}] mutation failed`, context, err);

  return isNotFound
    ? NextResponse.json({ error: (err as Error).message }, { status: 404 })
    : NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
