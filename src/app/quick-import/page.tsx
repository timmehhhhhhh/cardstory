import { QuickImportClient } from "@/app/quick-import/_components/quick-import-client";
import { requireSession } from "@/lib/auth/require-session";

export default async function QuickImportPage() {
  await requireSession();
  return <QuickImportClient />;
}
