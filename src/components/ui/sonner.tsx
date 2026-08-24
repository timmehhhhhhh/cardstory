"use client"

import type { CSSProperties } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Thin shadcn-style wrapper around sonner, themed off our own CSS variables
 * (see globals.css) rather than sonner's built-in palette — same pattern as
 * every other ui/ primitive here (dialog.tsx, select.tsx, ...).
 */
function Toaster({ ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--error-bg": "var(--popover)",
          "--error-text": "var(--destructive)",
          "--error-border": "var(--destructive)",
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
