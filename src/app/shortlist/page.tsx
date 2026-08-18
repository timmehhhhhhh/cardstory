import type { Metadata } from "next";
import { ShortlistClient } from "@/app/shortlist/_components/shortlist-client";

export const metadata: Metadata = { title: "In-Store Shortlist" };

export default function ShortlistPage() {
  return <ShortlistClient />;
}
