import { TradeAnalyzerClient } from "@/app/trade-analyzer/_components/trade-analyzer-client";
import { requireSession } from "@/lib/auth/require-session";

export default async function TradeAnalyzerPage() {
  await requireSession();
  return <TradeAnalyzerClient />;
}
