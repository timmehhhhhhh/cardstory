import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ACTIVITY_CATEGORIES, actionsForCategory, type ActivityCategory } from "@/lib/activity/categories";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const categoryParam = sp.get("category") ?? "all";
  const category: ActivityCategory = (ACTIVITY_CATEGORIES as readonly string[]).includes(categoryParam)
    ? (categoryParam as ActivityCategory)
    : "all";
  const cursor = sp.get("cursor") ?? undefined;
  const actions = actionsForCategory(category);

  const rows = await db.activityLog.findMany({
    where: {
      userId: session.user.id,
      ...(actions ? { action: { in: actions } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, action: true, entityType: true, summary: true, createdAt: true },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const items = (hasMore ? rows.slice(0, PAGE_SIZE) : rows).map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entityType,
    summary: r.summary,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ items, nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null });
}
