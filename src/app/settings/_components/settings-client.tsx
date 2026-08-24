"use client";

import * as React from "react";
import { EyeOff, Settings as SettingsIcon, Store } from "lucide-react";
import { useSession } from "next-auth/react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function SettingRow({
  icon,
  id,
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
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
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function SettingsClient() {
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
      if (res.ok) await update({ isVendor });
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
      if (res.ok) await update({ hidePricing });
    } finally {
      setPricingPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">User Settings</h1>
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
            checked={session.user.isVendor}
            disabled={vendorPending}
            onCheckedChange={handleVendorToggle}
          />
          <SettingRow
            icon={<EyeOff className="size-4" />}
            id="hide-pricing-toggle"
            title="Hide pricing & values"
            description="Hides all price charts and monetary values across CardStory. Only affects how things look to you, and follows your account to any device."
            checked={session.user.hidePricing}
            disabled={pricingPending}
            onCheckedChange={handleHidePricingToggle}
          />
        </div>
      )}
    </div>
  );
}
