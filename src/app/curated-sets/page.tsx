import type { Metadata } from "next";
import { CuratedSetsClient } from "@/app/curated-sets/_components/curated-sets-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Curated Sets" };

export default async function CuratedSetsPage() {
  await requireSession();
  return <CuratedSetsClient />;
}
