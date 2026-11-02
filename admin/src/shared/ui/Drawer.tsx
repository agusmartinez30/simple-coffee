"use client";

import clsx from "clsx";
import { useEffect, useRef, type ReactNode } from "react";
import { FOCUSABLE_SELECTOR, getTrapTarget } from "./focus-trap";

export type DrawerProps = {
  /** Id of the heading that names the dialog. */
  labelledBy: string;
  onClose: () => void;
  /**
   * `right` (default): white side panel under the top bar. `left`: full-height panel from the left
   * edge (the mobile navigation menu), whose look comes from its content.
   */
  placement?: "right" | "left";
  /** Width class of the panel. */
  className?: string;
  children: ReactNode;
};

const PLACEMENT_CLASSES = {
  right: "top-(--topbar-h) right-0 bottom-0 bg-surface shadow-drawer outline-1 -outline-offset-[0.5px] outline-line",
  left: "inset-y-0 left-0 shadow-drawer",
} as const;

/**
 * Side panel `dialog` over a light scrim, pinned to the right under the top bar (whose height is
 * `--topbar-h`) or to the left edge. Same focus rules as `Modal`: focus starts on the first field
 * (else the first focusable element), stays inside and returns to the opener on close; Escape and
 * the scrim call `onClose`. A `Modal` rendered after it stacks on top.
 */
export function Drawer({ labelledBy, onClose, placement = "right", className = "w-[400px]", children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const first =
      panel?.querySelector<HTMLElement>("input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled])") ??
      panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    first?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-30 bg-ink/20"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          } else if (event.key === "Tab" && panelRef.current) {
            const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
              (element) => !element.hidden && element.tabIndex >= 0,
            );
            const target = getTrapTarget(focusable.length, focusable.indexOf(document.activeElement as HTMLElement), event.shiftKey);
            if (target === null) return;
            event.preventDefault();
            focusable[target].focus();
          }
        }}
        className={clsx("fixed flex max-w-full flex-col", PLACEMENT_CLASSES[placement], className)}
      >
        {children}
      </div>
    </div>
  );
}
