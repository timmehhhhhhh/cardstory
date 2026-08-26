import type { Metadata } from "next";
import { CuratedSetDetailClient } from "@/app/curated-sets/[id]/_components/curated-set-detail-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Curated Set" };

export default async function CuratedSetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  return <CuratedSetDetailClient curatedSetId={id} />;
}
