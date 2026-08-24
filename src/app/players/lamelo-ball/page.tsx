import { getPlayerChecklist } from "@/lib/sportscards/manage";
import { ChecklistClient } from "./_components/checklist-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata = {
  title: "LaMelo Ball Card Checklist — CardStory",
};

export const dynamic = "force-dynamic";

export default async function LameloBallPage() {
  await requireSession();
  const cards = await getPlayerChecklist("NBA", "LaMelo Ball");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">LaMelo Ball — Card Checklist</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Base cards, inserts, and short prints, season by season. Photos are linked from external
          sources where a confident match was found — card backs in particular are rarely
          photographed, so most cards will only show a front. Check off any parallel you own to add
          it straight to your PC.
        </p>
      </div>
      <ChecklistClient cards={cards} />
    </main>
  );
}
