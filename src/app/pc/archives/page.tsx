import type { Metadata } from "next";
import { ArchiveClient } from "@/components/pc/archive-client";

export const metadata: Metadata = { title: "PC Archives" };

export default function PCArchivesPage() {
  return <ArchiveClient scopeKind="personal" title="PC Archives" backHref="/pc" backLabel="Back to PC" />;
}
