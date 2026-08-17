"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  History as HistoryIcon,
  Search,
  PlusCircle,
  Trash2,
  Pencil,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_LABELS, type ActivityCategory } from "@/lib/activity/categories";

interface ActivityItem {
  id: string;
  action: string;
  entityType: string | null;
  summary: string;
  createdAt: string;
}

interface HistoryResponse {
  items: ActivityItem[];
  nextCursor: string | null;
}

function ActivityIcon({ action }: { action: string }) {
  if (action.startsWith("search.")) return <Search className="size-4" />;
  if (action.startsWith("vendor.")) return <Store className="size-4" />;
  if (action.endsWith(".deleted")) return <Trash2 className="size-4" />;
  if (action.endsWith(".updated") || action.endsWith(".renamed")) return <Pencil className="size-4" />;
  return <PlusCircle className="size-4" />;
}

function formatTimestamp(iso: string): { relative: string; absolute: string } {
  const date = new Date(iso);
  const absolute = date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  let relative: string;
  if (Math.abs(diffMinutes) < 60) {
    relative = rtf.format(diffMinutes, "minute");
  } else if (Math.abs(diffMinutes) < 60 * 24) {
    relative = rtf.format(Math.round(diffMinutes / 60), "hour");
  } else {
    relative = rtf.format(Math.round(diffMinutes / (60 * 24)), "day");
  }
  return { relative, absolute };
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const { relative, absolute } = formatTimestamp(item.createdAt);
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-surface-elevated/50 px-3 py-2.5">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ActivityIcon action={item.action} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm leading-snug">{item.summary}</p>
        <time dateTime={item.createdAt} title={absolute} className="text-xs text-muted-foreground">
          {relative}
        </time>
      </div>
    </li>
  );
}

function EmptyState({ title, description }: { title: string; description: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function HistoryFeed({ category }: { category: ActivityCategory }) {
  const query = useInfiniteQuery<HistoryResponse>({
    queryKey: ["history", category],
    queryFn: async ({ pageParam }) => {
      const sp = new URLSearchParams();
      sp.set("category", category);
      if (pageParam) sp.set("cursor", pageParam as string);
      const res = await fetch(`/api/history?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load history");
      return res.json();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  if (query.isLoading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        description="Actions like searches, adding cards, and account changes will show up here as you use CardStory."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </ul>
      {query.hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="self-center"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}

export function HistoryClient() {
  const { data: session, status } = useSession();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex items-center gap-2">
        <HistoryIcon className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">History</h1>
      </div>

      {status === "loading" ? null : !session?.user ? (
        <EmptyState
          title="Sign in to see your history"
          description={
            <>
              Your searches, card additions, and account changes will show up here once you&apos;re signed in.{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </>
          }
        />
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            {ACTIVITY_CATEGORIES.map((category) => (
              <TabsTrigger key={category} value={category}>
                {ACTIVITY_CATEGORY_LABELS[category]}
              </TabsTrigger>
            ))}
          </TabsList>
          {ACTIVITY_CATEGORIES.map((category) => (
            <TabsContent key={category} value={category} className="mt-4">
              <HistoryFeed category={category} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
