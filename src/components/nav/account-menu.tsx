"use client";

import * as React from "react";
import Link from "next/link";
import { History, LogOut, Store, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu() {
  const { data: session, update } = useSession();
  const [pending, setPending] = React.useState(false);

  if (!session?.user) return null;

  async function handleVendorToggle(isVendor: boolean) {
    setPending(true);
    try {
      const res = await fetch("/api/account/vendor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVendor }),
      });
      if (res.ok) await update({ isVendor });
    } finally {
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account menu">
          <User className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {session.user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-3 px-2 py-1.5">
          <Label htmlFor="vendor-toggle" className="flex items-center gap-2 text-sm font-normal">
            <Store className="size-4 text-muted-foreground" />
            Vendor account
          </Label>
          <Switch
            id="vendor-toggle"
            size="sm"
            checked={session.user.isVendor}
            disabled={pending}
            onCheckedChange={handleVendorToggle}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/history">
            <History className="size-4" />
            History
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
