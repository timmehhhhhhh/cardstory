import type { Metadata } from "next";
import { ArchiveClient } from "@/components/pc/archive-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Business Archives" };

export default async function BusinessArchivesPage() {
  await requireSession();
  return (
    <ArchiveClient scopeKind="business" title="Business Archives" backHref="/business" backLabel="Back to Business Inventory" />
  );
}
