"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Camera, Menu } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { APP_NAME, NAV_LINKS } from "@/lib/constants";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { CurrencySelector } from "@/components/nav/currency-selector";
import { SearchBox } from "@/components/nav/search-box";
import { AccountMenu } from "@/components/nav/account-menu";

function Logo() {
  return (
    <Link href="/explore" className="flex items-center shrink-0">
      <Image
        src="/brand/cardstory-wordmark.png"
        alt={APP_NAME}
        width={900}
        height={325}
        priority
        className="h-8 w-auto sm:h-9 dark:hidden"
      />
      <Image
        src="/brand/cardstory-wordmark-dark.png"
        alt={APP_NAME}
        width={900}
        height={325}
        priority
        className="hidden h-8 w-auto sm:h-9 dark:block"
      />
    </Link>
  );
}

function NavLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {NAV_LINKS.map((link) => {
        const active = pathname === link.href || pathname?.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileAccountSection({ onNavigate }: { onNavigate: () => void }) {
  const { data: session } = useSession();
  return (
    <div className="flex items-center justify-between px-3">
      <span className="truncate text-sm text-muted-foreground">{session?.user?.email}</span>
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
  );
}

export function TopNav() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { status } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-backdrop-blur:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />

        <NavLinks className="ml-2 hidden md:flex" />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Link href="/scan">
              <Camera className="size-4" />
              Scan
            </Link>
          </Button>
          <SearchBox />
          <div className="hidden sm:block">
            <CurrencySelector />
          </div>
          <ThemeToggle />

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
              <SheetTitle className="px-4 pt-4">{APP_NAME}</SheetTitle>
              <div className="mt-2 flex flex-col gap-1 px-2">
                <NavLinks className="flex-col items-stretch" onNavigate={() => setMobileOpen(false)} />
                <Link
                  href="/scan"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 flex items-center gap-2 rounded-md border border-primary/40 px-3 py-2 text-sm font-medium text-primary"
                >
                  <Camera className="size-4" />
                  Scan a card
                </Link>
                <div className="mt-4 flex items-center justify-between px-3">
                  <span className="text-sm text-muted-foreground">Currency</span>
                  <CurrencySelector />
                </div>

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
