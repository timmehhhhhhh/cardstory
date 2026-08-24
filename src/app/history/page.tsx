import type { Metadata } from "next";
import { HistoryClient } from "@/app/history/_components/history-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  await requireSession();
  return <HistoryClient />;
}
