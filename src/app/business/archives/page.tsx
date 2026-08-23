import type { Metadata } from "next";
import { ArchiveClient } from "@/components/pc/archive-client";

export const metadata: Metadata = { title: "Business Archives" };

export default function BusinessArchivesPage() {
  return (
    <ArchiveClient scopeKind="business" title="Business Archives" backHref="/business" backLabel="Back to Business Inventory" />
  );
}
