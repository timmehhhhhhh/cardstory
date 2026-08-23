import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

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
  // Thrown by manage.ts's deletePC when it holds archived cards with
  // nowhere else of the same kind to go — a real, expected refusal (not a
  // bug), so it gets its own status instead of collapsing into the generic
  // 500 below.
  const isArchiveConflict = err instanceof Error && err.message === "PC has archived cards";

  if (isStaleSessionUserError(err)) {
    console.error(`[${context.route}] stale session (userId has no users row)`, context, err);
    return staleSessionResponse();
  }

  if (isArchiveConflict) {
    return NextResponse.json(
      {
        error:
          "This PC still has archived cards with nowhere else to go. Create another PC of the same type first, or permanently delete its archived cards.",
      },
      { status: 409 }
    );
  }

  console.error(`[${context.route}] mutation failed`, context, err);

  return isNotFound
    ? NextResponse.json({ error: (err as Error).message }, { status: 404 })
    : NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

/**
 * True when `err` is Prisma's foreign-key-violation error (P2003) — the
 * failure a `db.portfolio.create`/`upsert` with `data: { userId, ... }`
 * throws when `userId` (from the session) has no matching row in `users`.
 * That happens when a session's JWT outlives the account it names — e.g. a
 * stale/cached session cookie surviving a dev DB reset/reseed, or (in
 * principle) an account deleted from another tab. Sessions here are
 * JWT-based with no DB-backed session state (see src/auth.ts), so nothing
 * upstream of the write already validated `session.user.id` refers to a
 * real user — this is the first and only point that finds out.
 *
 * Narrow to P2003 specifically (not "any Prisma error") so a genuinely
 * unexpected DB failure still surfaces as the generic 500 below instead of
 * being mislabeled as an auth problem.
 */
export function isStaleSessionUserError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003";
}

/**
 * 401 asking the client to re-authenticate, for the stale-session case
 * above. Deliberately 401 (not 500): the write itself was never wrong, the
 * credentials backing it were — the same status the top-of-handler
 * `!session?.user` check already uses for "no session," so the client's
 * existing "401 → send to /login" handling (if any) covers this too rather
 * than needing a second code to special-case.
 */
export function staleSessionResponse(): NextResponse {
  return NextResponse.json(
    { error: "Your session is no longer valid. Please sign in again." },
    { status: 401 }
  );
}
