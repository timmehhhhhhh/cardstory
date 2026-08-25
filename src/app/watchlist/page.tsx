import type { Metadata } from "next";
import { WatchlistClient } from "@/app/watchlist/_components/watchlist-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Watchlist" };

export default async function WatchlistPage() {
  await requireSession();
  return <WatchlistClient />;
}
