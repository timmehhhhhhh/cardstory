import type { Metadata } from "next";
import { PCClient } from "@/app/pc/_components/pc-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "PC" };

export default async function PCPage() {
  await requireSession();
  return <PCClient />;
}
