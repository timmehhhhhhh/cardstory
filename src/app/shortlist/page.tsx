import type { Metadata } from "next";
import { ShortlistClient } from "@/app/shortlist/_components/shortlist-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "In-Store Shortlist" };

export default async function ShortlistPage() {
  await requireSession();
  return <ShortlistClient />;
}
