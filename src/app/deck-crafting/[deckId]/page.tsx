import type { Metadata } from "next";
import { DeckEditorClient } from "@/app/deck-crafting/[deckId]/_components/deck-editor-client";

export const metadata: Metadata = { title: "Deck Crafting" };

export default async function DeckEditorPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  return <DeckEditorClient deckId={deckId} />;
}
