"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/constants";
import { MobileSearchSheet } from "@/components/nav/mobile-search-sheet";

/**
 * Mobile-only bottom tab bar (md:hidden — see layout.tsx) replacing the
 * hamburger drawer's section links, per the Apple Store-style pattern the
 * user asked for. Unlike Apple Store's fixed 4-icon bar, CardStory has 11
 * sections (NAV_LINKS, same source TopNav's desktop links use), so the
 * strip itself scrolls horizontally with snap points instead of trying to
 * fit everything — the active section is auto-scrolled into view so
 * swiping isn't required just to see where you are. The circular Search
 * button sits outside the scrollable strip, always visible, and opens the
 * full-screen MobileSearchSheet (same visual language as Apple Store's
 * separate search button next to its tab bar).
 */
export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const activeRef = React.useRef<HTMLAnchorElement>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  // Edge fades hint that the strip scrolls further in that direction — the
  // right one is the main discoverability cue (11 sections don't all fit),
  // the left one shows once the user has scrolled away from the start.
  const [showLeftFade, setShowLeftFade] = React.useState(false);
  const [showRightFade, setShowRightFade] = React.useState(false);

  const links = NAV_LINKS.filter(
    (link) => !("vendorOnly" in link && link.vendorOnly) || session?.user?.isVendor
  );

  const updateFades = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setShowLeftFade(el.scrollLeft > 4);
    setShowRightFade(el.scrollLeft < maxScroll - 4);
  }, []);

  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    // Wait for the smooth scroll-into-view to settle before recomputing.
    const timeout = setTimeout(updateFades, 350);
    return () => clearTimeout(timeout);
  }, [pathname, updateFades]);

  React.useEffect(() => {
    updateFades();
    const el = scrollerRef.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver(updateFades);
    resizeObserver.observe(el);
    window.addEventListener("resize", updateFades);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFades);
    };
  }, [updateFades, links.length]);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-1 border-t border-border bg-background/85 pl-1 backdrop-blur supports-backdrop-blur:bg-background/60 md:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)" }}
        aria-label="Sections"
      >
        <div className="relative flex min-w-0 flex-1 items-center">
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background/90 to-transparent transition-opacity duration-200",
              showLeftFade ? "opacity-100" : "opacity-0"
            )}
          />
          <div
            ref={scrollerRef}
            onScroll={updateFades}
            className="flex flex-1 items-center gap-1 overflow-x-auto scroll-smooth py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {links.map((link) => {
              const active = pathname === link.href || pathname?.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  ref={active ? activeRef : undefined}
                  href={link.href}
                  className={cn(
                    "flex shrink-0 snap-center flex-col items-center gap-0.5 rounded-md px-3 py-1 text-[11px] font-medium whitespace-nowrap transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
                  )}
                >
                  {"icon" in link && link.icon ? <link.icon className="size-5" /> : (
                    <span className="size-5" aria-hidden />
                  )}
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background/90 to-transparent transition-opacity duration-200",
              showRightFade ? "opacity-100" : "opacity-0"
            )}
          />
        </div>

        <div className="flex shrink-0 items-center pr-4">
          <Button
            variant="ghost"
            size="icon-lg"
            className="rounded-full bg-surface-elevated text-muted-foreground hover:text-foreground"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-5" />
          </Button>
        </div>
      </nav>

      <MobileSearchSheet open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
