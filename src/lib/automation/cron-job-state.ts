/**
 * Shared read/write helpers around the `CronJobState` table — the Postgres
 * replacement for scripts/lib/crawl-cache.ts's fs-based resumability, used
 * by every job under src/lib/automation/ (see prisma/schema.prisma's
 * CronJobState doc comment).
 *
 * Idempotency/chunking contract every job follows (see the plan's §5):
 *   1. Read the job's cursor via getCronCursor().
 *   2. Do one bounded chunk of work.
 *   3. On success: recordCronSuccess() — upserts cursor + lastStatus: "ok" +
 *      lastSummary.
 *   4. On a polite-fetch.ts CrawlAbortedError (circuit breaker tripped):
 *      recordCronCircuitBroken() — lastStatus: "circuit-broken", cursor left
 *      untouched so the next run retries the same window instead of
 *      skipping ids a host refused.
 *   5. On any other unexpected error: recordCronError() — lastStatus:
 *      "error"/lastError, cursor left untouched; the caller (the API route)
 *      still returns a non-200 so the Cron Trigger's own failure log
 *      captures it.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function getCronCursor<T = unknown>(jobName: string): Promise<T | null> {
  const row = await db.cronJobState.findUnique({ where: { name: jobName }, select: { cursor: true } });
  return row?.cursor != null ? (row.cursor as T) : null;
}

export async function recordCronSuccess(
  jobName: string,
  cursor: Prisma.InputJsonValue | null,
  summary: Prisma.InputJsonValue
): Promise<void> {
  const cursorValue = cursor === null ? Prisma.JsonNull : cursor;
  await db.cronJobState.upsert({
    where: { name: jobName },
    create: { name: jobName, cursor: cursorValue, lastRunAt: new Date(), lastStatus: "ok", lastSummary: summary, lastError: null },
    update: { cursor: cursorValue, lastRunAt: new Date(), lastStatus: "ok", lastSummary: summary, lastError: null },
  });
}

export async function recordCronCircuitBroken(
  jobName: string,
  message: string,
  summary?: Prisma.InputJsonValue
): Promise<void> {
  await db.cronJobState.upsert({
    where: { name: jobName },
    // Cursor is deliberately absent from both branches — untouched on
    // update, unset (null) on first-ever run — so a host refusal never
    // skips past the ids/pages it refused.
    create: { name: jobName, lastRunAt: new Date(), lastStatus: "circuit-broken", lastError: message, lastSummary: summary },
    update: { lastRunAt: new Date(), lastStatus: "circuit-broken", lastError: message, lastSummary: summary },
  });
}

export async function recordCronError(jobName: string, message: string): Promise<void> {
  await db.cronJobState.upsert({
    where: { name: jobName },
    // Cursor untouched here too — see recordCronCircuitBroken above.
    create: { name: jobName, lastRunAt: new Date(), lastStatus: "error", lastError: message },
    update: { lastRunAt: new Date(), lastStatus: "error", lastError: message },
  });
}
