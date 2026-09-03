"use client";

import * as React from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The single place a card image is rendered.
 *
 * Renders *inner content only* — the <Image fill> or its fallback — so it must
 * sit inside a `relative`-positioned parent. Every call site already owns its
 * own `relative aspect-[5/7] … bg-muted` wrapper with badges layered on top,
 * so keeping this component "inner only" means adopting it is a one-line swap
 * rather than a layout rewrite.
 *
 * Why this exists: before it, each of the ~12 render sites inlined its own
 * missing-image branch and *none* handled onError, so a rotted third-party URL
 * rendered as a broken image. Since we never re-host images (every URL points
 * at a provider's CDN — see prisma/schema.prisma CatalogItem.imageSmallUrl),
 * rot is a question of when, not if.
 */

/**
 * How long a `src` is given to actually finish loading before this falls
 * back to the "no image" state — a slow/overloaded third-party host can
 * leave the browser's request hanging far longer than a normal 404 takes
 * to fail (confirmed against a real rotted URL: a raw TCP connect to the
 * origin sometimes succeeded, sometimes hung past a minute, with no clean
 * error either way), which otherwise left the pocket sitting blank
 * indefinitely instead of showing the onError fallback. The <Image> keeps
 * loading in the background even after this fires (see the `invisible`
 * class below, not `display:none`) — if it does eventually succeed, onLoad
 * still clears the stall and swaps the real image back in.
 */
const LOAD_STALL_MS = 6_000;

export type CardImageFallbackVariant = "icon" | "icon-label" | "text";

export function CardImageFallback({
  variant = "icon",
  className,
}: {
  variant?: CardImageFallbackVariant;
  className?: string;
}) {
  if (variant === "text") {
    return (
      <span
        className={cn(
          "flex size-full items-center justify-center px-1 text-center text-[10px] leading-tight text-muted-foreground",
          className
        )}
      >
        No image
      </span>
    );
  }

  if (variant === "icon-label") {
    return (
      <span
        className={cn(
          "flex size-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground",
          className
        )}
      >
        <ImageOff className="size-4" aria-hidden />
        No image
      </span>
    );
  }

  return (
    <span
      className={cn("flex size-full items-center justify-center text-muted-foreground", className)}
    >
      <ImageOff className="size-3.5" aria-hidden />
    </span>
  );
}

export interface CardImageProps {
  /** Null/undefined renders the fallback immediately — no <Image> is mounted. */
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  /** Applied to the <Image>; call sites keep their own `object-contain p-2` etc. */
  className?: string;
  /** Full replacement for the fallback content (e.g. the sports "attach a photo" affordance). */
  fallback?: React.ReactNode;
  fallbackVariant?: CardImageFallbackVariant;
  /** Rendered above the image when one is showing — e.g. the sports parallel watermark. */
  overlay?: React.ReactNode;
  priority?: boolean;
}

export function CardImage({
  src,
  alt,
  sizes,
  className,
  fallback,
  fallbackVariant = "icon",
  overlay,
  priority,
}: CardImageProps) {
  // Tracks *which* URL failed rather than a boolean, so changing `src`
  // inherently clears the failure with no reset effect. Without that, a single
  // dead image would poison a recycled component instance and re-sorting or
  // paginating a grid would show the fallback for a perfectly good URL that
  // happened to land on the same slot.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const failed = !!src && failedSrc === src;

  // Same "track which src, not a bare boolean" reasoning as failedSrc above
  // — comparing against the current `src` below means a src change (new
  // card, re-sorted grid) is inherently "not stalled" with no reset effect
  // needed, exactly like failedSrc never resets itself either.
  const [stalledSrc, setStalledSrc] = React.useState<string | null>(null);
  // Mirrors `src` once onLoad fires for it. A ref (not state) so the
  // setTimeout callback below can check "did this src already load?" via
  // closure without needing to be in the effect's dependency array — adding
  // it there would re-schedule the timer on every load, defeating the point.
  const loadedSrcRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!src) return;
    const timer = setTimeout(() => {
      // The image may have already finished loading by the time this
      // fires — onLoad's stalledSrc reset above is a no-op in that case
      // (stalledSrc was never set to src yet), so without this check the
      // timer would still flip `stalled` true and hide a perfectly loaded
      // image a few seconds after it appeared.
      if (loadedSrcRef.current !== src) setStalledSrc(src);
    }, LOAD_STALL_MS);
    return () => clearTimeout(timer);
  }, [src]);
  const stalled = !!src && stalledSrc === src;

  if (!src || failed) {
    return <>{fallback ?? <CardImageFallback variant={fallbackVariant} />}</>;
  }

  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        // Every call site used `unoptimized` before this component existed;
        // keeping it means next.config.ts remotePatterns is never consulted.
        unoptimized
        referrerPolicy="no-referrer"
        onLoad={() => {
          loadedSrcRef.current = src;
          setStalledSrc((s) => (s === src ? null : s));
        }}
        onError={() => {
          if (process.env.NODE_ENV === "development") {
            console.warn("[CardImage] failed to load:", src);
          }
          setFailedSrc(src);
        }}
        // `invisible` (not conditionally unmounting) keeps the underlying
        // <img> request alive while stalled, so a late success still swaps
        // it back in via onLoad above instead of being stuck showing the
        // fallback forever once the real image was actually reachable.
        className={cn(className, stalled && "invisible")}
      />
      {stalled && (
        <div className="absolute inset-0">{fallback ?? <CardImageFallback variant={fallbackVariant} />}</div>
      )}
      {overlay}
    </>
  );
}
