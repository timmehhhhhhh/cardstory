"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, History, Menu, Mic, Settings } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { AccountMenu } from "@/components/nav/account-menu";
import { Logo } from "@/components/nav/logo";

function MobileAccountSection({ onNavigate }: { onNavigate: () => void }) {
  const { data: session } = useSession();
  return (
    <div className="flex flex-col gap-2 px-3">
      <span className="truncate text-sm text-muted-foreground">{session?.user?.email}</span>
      <Button asChild variant="ghost" size="sm" className="justify-start">
        <Link href="/settings" onClick={onNavigate}>
          <Settings className="size-4" />
          Settings
        </Link>
      </Button>
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/history" onClick={onNavigate}>
            <History className="size-4" />
            History
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onNavigate();
            signOut({ callbackUrl: "/" });
          }}
        >
          Log out
        </Button>
      </div>
    </div>
  );
}

export function TopNav() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { status } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-backdrop-blur:bg-background/60 md:hidden">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Link href="/scan">
              <Camera className="size-4" />
              Scan Cards
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Link href="/quick-import">
              <Mic className="size-4" />
              Quick Import
            </Link>
          </Button>
          {/* Search now lives in BottomNav's circular Search button (mobile)
              and SideNav (desktop) — TopNav itself is mobile-only. */}

          {status === "authenticated" ? (
            <AccountMenu />
          ) : status !== "loading" ? (
            <div className="hidden items-center gap-1 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
              >
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          ) : null}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-background border-border">
              <SheetTitle className="px-4 pt-4">Account</SheetTitle>
              <div className="mt-2 flex flex-col gap-1 px-2">
                {/* Section links now live in BottomNav's scrollable tab bar
                    on mobile — this drawer stays for account actions only. */}
                <Link
                  href="/scan"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-md border border-primary/40 px-3 py-2 text-sm font-medium text-primary"
                >
                  <Camera className="size-4" />
                  Scan Cards
                </Link>
                <Link
                  href="/quick-import"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-md border border-primary/40 px-3 py-2 text-sm font-medium text-primary"
                >
                  <Mic className="size-4" />
                  Quick Import
                </Link>
                <div className="mt-4 border-t border-border pt-4 sm:hidden">
                  {status === "authenticated" ? (
                    <MobileAccountSection onNavigate={() => setMobileOpen(false)} />
                  ) : status !== "loading" ? (
                    <div className="flex flex-col gap-2 px-3">
                      <Button asChild variant="outline" size="sm" onClick={() => setMobileOpen(false)}>
                        <Link href="/login">Log in</Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        className="bg-primary text-primary-foreground"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Link href="/signup">Sign up</Link>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
