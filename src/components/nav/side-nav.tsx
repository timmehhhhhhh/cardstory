"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, History, LogOut, Settings } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/constants";
import { Logo } from "@/components/nav/logo";
import { SearchBox } from "@/components/nav/search-box";

/**
 * Desktop-only (md: and up — see layout.tsx) left vertical navigation rail,
 * replacing TopNav's horizontal desktop link row. NAV_LINKS has grown to 11
 * sections, too many for a horizontal bar, so desktop gets a scrollable
 * vertical list instead — mobile keeps the existing TopNav + BottomNav
 * pattern untouched. Structure (logo, section list, primary CTA, account
 * area near the bottom) is inspired by a standard mobile nav-drawer layout.
 */
export function SideNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const links = NAV_LINKS.filter(
    (link) => !("vendorOnly" in link && link.vendorOnly) || session?.user?.isVendor
  );

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-background/85 backdrop-blur supports-backdrop-blur:bg-background/60 md:flex"
      aria-label="Primary"
    >
      <div className="px-4 pt-4 pb-2">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {links.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-surface-elevated text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
              )}
            >
              {"icon" in link && link.icon ? <link.icon className="size-4 shrink-0" /> : null}
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
        <SearchBox inputClassName="w-full" triggerClassName="w-full justify-start px-3" />

        <Button
          asChild
          variant="outline"
          size="sm"
          className="justify-start border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Link href="/scan">
            <Camera className="size-4" />
            Scan Cards
          </Link>
        </Button>

        <div className="mt-1 border-t border-border pt-3">
          {status === "authenticated" ? (
            <div className="flex flex-col gap-1">
              <span className="truncate px-1 text-xs text-muted-foreground">
                {session?.user?.email}
              </span>
              <Button asChild variant="ghost" size="sm" className="justify-start">
                <Link href="/settings">
                  <Settings className="size-4" />
                  Settings
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="justify-start">
                <Link href="/history">
                  <History className="size-4" />
                  History
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-muted-foreground hover:text-foreground"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="size-4" />
                Log out
              </Button>
            </div>
          ) : status !== "loading" ? (
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-primary text-primary-foreground"
              >
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
