import type { Metadata } from "next";
import { BinderClient } from "@/app/binder/_components/binder-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Binder Planner" };

export default async function BinderPage() {
  await requireSession();
  return <BinderClient />;
}
