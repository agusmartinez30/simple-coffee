"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Tailwind's `lg` breakpoint (64rem): the desktop layout of the back office starts here. */
export const DESKTOP_QUERY = "(min-width: 64rem)";

/**
 * Whether `query` matches the viewport. The server render and hydration use `serverValue`, so the
 * markup matches; the real value follows right after mount and on every change.
 */
export function useMediaQuery(query: string, serverValue: boolean): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** True at `lg` and above. Assumes desktop until mounted (the layout the exports were drawn for). */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY, true);
}
