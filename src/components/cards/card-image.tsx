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
        onError={() => {
          if (process.env.NODE_ENV === "development") {
            console.warn("[CardImage] failed to load:", src);
          }
          setFailedSrc(src);
        }}
        className={className}
      />
      {overlay}
    </>
  );
}
