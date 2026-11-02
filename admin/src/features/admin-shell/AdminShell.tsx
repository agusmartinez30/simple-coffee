"use client";

import { useId, useState, type ReactNode } from "react";
import { Drawer } from "@/shared/ui";
import { useIsDesktop } from "@/shared/lib/use-media-query";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

type AdminShellProps = {
  children: ReactNode;
};

/**
 * Authenticated back-office frame: sidebar, top bar and the scrolling main area. From `lg` the
 * sidebar is the fixed 220px rail; below it the top bar's menu button opens the same sidebar as
 * an off-canvas drawer, which closes on navigation, Escape or the scrim.
 */
export function AdminShell({ children }: AdminShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const menuTitleId = useId();
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-cream">
      <AdminSidebar variant="rail" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} />
        {/* Each screen owns its padding: the exports use different gutters per module. */}
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
      {menuOpen && !isDesktop && (
        <Drawer labelledBy={menuTitleId} onClose={closeMenu} placement="left" className="w-[260px]">
          <AdminSidebar variant="drawer" titleId={menuTitleId} onNavigate={closeMenu} onClose={closeMenu} />
        </Drawer>
      )}
    </div>
  );
}
