"use client";

import { Store } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { usePCStore } from "@/lib/pc/store";

/**
 * Vendor-only Explore control: while on, cards added from Explore land in
 * the "Business Inventory" pc instead of whichever personal
 * pc is active — see the `businessMode` preference and
 * `ensureBusinessPC` in src/lib/pc/{local,remote}-store.ts.
 * Renders nothing for non-vendor accounts and logged-out visitors, since
 * isVendor is a server-side account flag (prisma/schema.prisma) with no
 * local-guest equivalent — toggle from the account menu to become one.
 */
export function BusinessModeToggle() {
  const { data: session } = useSession();
  const businessMode = usePCStore((s) => s.preferences.businessMode);
  const setBusinessMode = usePCStore((s) => s.setBusinessMode);
  const ensureBusinessPC = usePCStore((s) => s.ensureBusinessPC);

  if (!session?.user?.isVendor) return null;

  function handleClick() {
    // Create the Business Inventory pc (if it doesn't exist yet) up
    // front, as part of this click handler — not lazily while a dialog is
    // rendering — so it's guaranteed to exist by the time any Add-to-
    // PC dialog opens and wants to default into it.
    if (!businessMode) ensureBusinessPC();
    setBusinessMode(!businessMode);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={businessMode}
      onClick={handleClick}
      title="When on, cards you add from Explore go to your Business Inventory instead of your personal PC"
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        businessMode
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-surface text-muted-foreground hover:text-foreground"
      )}
    >
      <Store className="size-3.5" />
      Business mode
      <span
        className={cn(
          "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          businessMode ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {businessMode ? "On" : "Off"}
      </span>
    </button>
  );
}
