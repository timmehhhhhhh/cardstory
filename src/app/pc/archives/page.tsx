import type { Metadata } from "next";
import { ArchiveClient } from "@/components/pc/archive-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "PC Archives" };

export default async function PCArchivesPage() {
  await requireSession();
  return <ArchiveClient scopeKind="personal" title="PC Archives" backHref="/pc" backLabel="Back to PC" />;
}
