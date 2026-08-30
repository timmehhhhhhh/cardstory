"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { usePCStore } from "@/lib/pc/store";
import { pcKind } from "@/lib/pc/types";
import { CollectionPanel } from "@/app/card/[game]/[cardId]/_components/collection-panel";

/**
 * Business Inventory's view of this card's detail page — a vendor-only
 * sibling of CollectionPanel, scoped to the singleton "Business Inventory"
 * pc instead of whichever personal pc is globally active. Mirrors the
 * find-or-create pattern BusinessClient uses for /business itself (see
 * src/app/business/_components/business-client.tsx) so a vendor can add/
 * adjust/remove this card from their Business Inventory without leaving
 * the card page.
 */
export function BusinessHoldingsPanel({
  catalogItemId,
  sportsCardItemId,
  cardName,
  suggestedPrice,
  language,
}: {
  catalogItemId?: string;
  sportsCardItemId?: string;
  cardName: string;
  suggestedPrice: number | null;
  language?: string;
}) {
  const { data: session, status } = useSession();
  const pcs = usePCStore((s) => s.pcs);
  const ensureBusinessPC = usePCStore((s) => s.ensureBusinessPC);
  const businessPC = pcs.find((p) => pcKind(p) === "business");

  React.useEffect(() => {
    if (session?.user?.isVendor && !businessPC) ensureBusinessPC();
  }, [session?.user?.isVendor, businessPC, ensureBusinessPC]);

  if (status !== "loading" && !session?.user?.isVendor) return null;
  if (!businessPC) return null;

  return (
    <CollectionPanel
      catalogItemId={catalogItemId}
      sportsCardItemId={sportsCardItemId}
      cardName={cardName}
      suggestedPrice={suggestedPrice}
      language={language}
      pcId={businessPC.id}
      heading="Business Inventory"
      emptyText="Track this card in your Business Inventory."
    />
  );
}
