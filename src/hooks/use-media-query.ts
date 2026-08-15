"use client";

import * as React from "react";

function subscribe(query: string, onChange: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** SSR-safe media query hook — reports `false` on the server snapshot, then tracks live. */
export function useMediaQuery(query: string): boolean {
  return React.useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => window.matchMedia(query).matches,
    () => false
  );
}
