"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};

/**
 * Renders the printable pieces as a direct child of `<body>` marked `data-print-root`. On
 * screen it is hidden; under `@media print` (globals.css) it is the only thing printed, so
 * `window.print()` prints just the cards (and "Guardar como PDF" exports them).
 */
export function PrintPortal({ children }: { children: ReactNode }) {
  // Portals need `document`; skip the server render and hydrate on the client only.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) return null;
  return createPortal(<div data-print-root="">{children}</div>, document.body);
}

export function printDocument() {
  window.print();
}
