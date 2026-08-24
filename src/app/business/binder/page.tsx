import type { Metadata } from "next";
import { BusinessBinderClient } from "@/app/business/binder/_components/business-binder-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Business Binder Planner" };

export default async function BusinessBinderPage() {
  await requireSession();
  return <BusinessBinderClient />;
}
