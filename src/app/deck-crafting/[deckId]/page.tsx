import type { Metadata } from "next";
import { DeckEditorClient } from "@/app/deck-crafting/[deckId]/_components/deck-editor-client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Deck Crafting" };

export default async function DeckEditorPage({ params }: { params: Promise<{ deckId: string }> }) {
  await requireSession();
  const { deckId } = await params;
  return <DeckEditorClient deckId={deckId} />;
}
