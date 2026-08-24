import type { Metadata } from "next";
import { BusinessClient } from "@/app/business/_components/business-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Business Inventory" };

export default async function BusinessPage() {
  await requireSession();
  return <BusinessClient />;
}
