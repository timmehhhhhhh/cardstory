"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { usePCStore } from "@/lib/pc/store";
import { pcKind } from "@/lib/pc/types";
import { BinderClient } from "@/app/pc/binder/_components/binder-client";

/**
 * Thin wrapper that resolves the singleton Business Inventory pc and hands
 * its id to the shared BinderClient, fixed as the only card source (see
 * BusinessClient for the equivalent on the main /business dashboard).
 */
export function BusinessBinderClient() {
  const { data: session, status } = useSession();
  const pcs = usePCStore((s) => s.pcs);
  const ensureBusinessPC = usePCStore((s) => s.ensureBusinessPC);
  const businessPC = pcs.find((p) => pcKind(p) === "business");
  // ensureBusinessPC find-or-creates — only actually mutates the store the
  // first time a vendor ever lands here, when no business pc exists yet.
  React.useEffect(() => {
    if (!businessPC) ensureBusinessPC();
  }, [businessPC, ensureBusinessPC]);
  const businessPCId = businessPC?.id;

  if (status !== "loading" && !session?.user?.isVendor) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-12 text-center sm:px-6">
        <p className="text-sm text-muted-foreground">
          Business Inventory is a vendor feature. Turn on Vendor from your account menu to use it.
        </p>
      </div>
    );
  }

  if (!businessPCId) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-12 text-center sm:px-6">
        <p className="text-sm text-muted-foreground">Loading Business Inventory…</p>
      </div>
    );
  }

  return (
    <BinderClient
      pcIdOverride={businessPCId}
      showPcSelector={false}
      backHref="/business"
      backLabel="Back to Business"
    />
  );
}
