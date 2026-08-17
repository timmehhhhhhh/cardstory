import type { Metadata } from "next";
import { HistoryClient } from "@/app/history/_components/history-client";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return <HistoryClient />;
}
