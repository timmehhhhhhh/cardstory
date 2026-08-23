import { NextResponse } from "next/server";
import { isStaleSessionUserError, staleSessionResponse } from "@/lib/pc/route-errors";

export { isStaleSessionUserError, staleSessionResponse };

/**
 * Shared `try { mutate() } catch { ... }` handling for every
 * ownership-checked deck/card mutation route (src/app/api/decks/**),
 * mirroring src/lib/pc/route-errors.ts's mutationErrorResponse exactly —
 * manage.ts's assertOwnsDeck/assertOwnsCard throw a plain
 * Error("Deck not found") / Error("Card not found") for the expected "you
 * don't own this" case, which is the only case that reads as 404. Anything
 * else is unexpected and gets logged + reported as a 500.
 */
export function deckMutationErrorResponse(
  err: unknown,
  context: { route: string; userId: string; [key: string]: unknown }
): NextResponse {
  const isNotFound =
    err instanceof Error && (err.message === "Deck not found" || err.message === "Card not found");

  if (isStaleSessionUserError(err)) {
    console.error(`[${context.route}] stale session (userId has no users row)`, context, err);
    return staleSessionResponse();
  }

  console.error(`[${context.route}] mutation failed`, context, err);

  return isNotFound
    ? NextResponse.json({ error: (err as Error).message }, { status: 404 })
    : NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
