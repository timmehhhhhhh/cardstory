import type { Metadata } from "next";
import { GlossaryClient } from "@/app/glossary/_components/glossary-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Glossary" };

export default async function GlossaryPage() {
  await requireSession();
  return <GlossaryClient />;
}
