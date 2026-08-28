import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ImportClient } from "@/app/binder/import/_components/import-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Import Physical Binder" };

/**
 * Physical Binder Import route — reads `binderId` from the query string
 * (set by the "Import Physical Binder" entry button in
 * src/app/binder/_components/binder-client.tsx) rather than a dynamic
 * segment, since the binder itself is client-store-only (no server-side
 * fetch to key a [binderId] route off of — see src/lib/binder/store.ts).
 */
export default async function BinderImportPage({
  searchParams,
}: {
  searchParams: Promise<{ binderId?: string }>;
}) {
  await requireSession();
  const { binderId } = await searchParams;
  if (!binderId) redirect("/binder");
  return <ImportClient binderId={binderId} />;
}
