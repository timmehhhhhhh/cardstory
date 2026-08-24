import type { Metadata } from "next";
import { ViewsClient } from "@/app/views/_components/views-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Views" };

export default async function ViewsPage() {
  await requireSession();
  return <ViewsClient />;
}
