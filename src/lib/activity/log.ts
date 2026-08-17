import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Best-effort writer for the account-menu "History" feed (ActivityLog in
 * prisma/schema.prisma). Always awaited by callers — this runs on
 * serverless hosts where a dangling promise can be cut off once the
 * response is sent, so fire-and-forget isn't safe here — but its own
 * failures are swallowed so a logging hiccup never fails the user's actual
 * request.
 */
export async function logActivity(
  userId: string,
  entry: {
    action: string;
    entityType?: string;
    entityId?: string;
    summary: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        summary: entry.summary,
        metadata: entry.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error("activity log write failed", err);
  }
}
