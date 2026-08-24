import { ScanClient } from "@/app/scan/_components/scan-client";
import { requireSession } from "@/lib/auth/require-session";

export default async function ScanPage() {
  await requireSession();
  return <ScanClient />;
}
