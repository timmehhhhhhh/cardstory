"use client";

import * as React from "react";
import { Coins, EyeOff, Moon, Settings as SettingsIcon, Store, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CurrencySelector } from "@/components/nav/currency-selector";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AdminAddCard } from "@/app/settings/_components/admin-add-card";
import type { GameMeta } from "@/lib/games/registry";

function SettingRow({
  icon,
  id,
  title,
  description,
  control,
}: {
  icon: React.ReactNode;
  id: string;
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div className="flex gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={id} className="text-sm font-medium">
            {title}
          </Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {control}
    </div>
  );
}

function ThemeRow() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <SettingRow
      icon={isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
      id="dark-mode-toggle"
      title="Dark mode"
      description="Switch between light and dark theme."
      control={
        <Switch
          id="dark-mode-toggle"
          checked={isDark}
          disabled={!mounted}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        />
      }
    />
  );
}

export function SettingsClient({ adminAddCardGames }: { adminAddCardGames: GameMeta[] }) {
  const { data: session, status, update } = useSession();
  const [vendorPending, setVendorPending] = React.useState(false);
  const [pricingPending, setPricingPending] = React.useState(false);

  async function handleVendorToggle(isVendor: boolean) {
    setVendorPending(true);
    try {
      const res = await fetch("/api/account/vendor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVendor }),
      });
      if (res.ok) {
        await update({ isVendor });
      } else {
        toast.error("Couldn't update your vendor account setting.");
      }
    } catch {
      toast.error("Couldn't update your vendor account setting.");
    } finally {
      setVendorPending(false);
    }
  }

  async function handleHidePricingToggle(hidePricing: boolean) {
    setPricingPending(true);
    try {
      const res = await fetch("/api/account/pricing-visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidePricing }),
      });
      if (res.ok) {
        await update({ hidePricing });
      } else {
        toast.error("Couldn't update your pricing preference.");
      }
    } catch {
      toast.error("Couldn't update your pricing preference.");
    } finally {
      setPricingPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      {status === "loading" ? null : !session?.user ? (
        <p className="text-sm text-muted-foreground">Sign in to manage your settings.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <SettingRow
            icon={<Store className="size-4" />}
            id="vendor-toggle"
            title="Vendor account"
            description="Vendor accounts unlock Business Inventory and vendor-only tools."
            control={
              <Switch
                id="vendor-toggle"
                checked={session.user.isVendor}
                disabled={vendorPending}
                onCheckedChange={handleVendorToggle}
              />
            }
          />
          <SettingRow
            icon={<EyeOff className="size-4" />}
            id="hide-pricing-toggle"
            title="Hide pricing & values"
            description="Hides all price charts and monetary values across CardStory. Only affects how things look to you, and follows your account to any device."
            control={
              <Switch
                id="hide-pricing-toggle"
                checked={session.user.hidePricing}
                disabled={pricingPending}
                onCheckedChange={handleHidePricingToggle}
              />
            }
          />
          <SettingRow
            icon={<Coins className="size-4" />}
            id="currency-selector"
            title="Currency"
            description="Currency used to display card values across CardStory."
            control={<CurrencySelector />}
          />
          <ThemeRow />

          {session.user.isAdmin && (
            <div className="mt-2 border-t border-border pt-5">
              <AdminAddCard games={adminAddCardGames} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
