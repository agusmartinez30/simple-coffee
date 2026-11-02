"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { NAV_ITEMS, findActiveNavItem } from "./navigation";
import { SidebarNavItem } from "./SidebarNavItem";

type AdminSidebarProps =
  /** `rail`: the fixed 220px column, shown from `lg`. */
  | { variant: "rail" }
  /** `drawer`: the same navigation inside the mobile menu drawer, with its own close button. */
  | { variant: "drawer"; titleId: string; onNavigate: () => void; onClose: () => void };

/** Dark left navigation ("AdminSidebar" in the exports). */
export function AdminSidebar(props: AdminSidebarProps) {
  const pathname = usePathname();
  const activeId = findActiveNavItem(pathname)?.id;
  const drawer = props.variant === "drawer";

  return (
    <aside
      className={clsx(
        "shrink-0 flex-col gap-1 overflow-y-auto bg-sidebar px-3.5 py-[22px]",
        drawer ? "flex h-full w-full" : "sticky top-0 hidden h-screen w-[220px] lg:flex",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 px-2.5 pb-[18px]">
          <p id={drawer ? props.titleId : undefined} className="text-[17px] font-bold tracking-[1.5px] whitespace-nowrap text-white">
            CAFÉ CENTRAL
          </p>
          <p className="text-[12px] whitespace-nowrap text-white/60">Panel de operaciones</p>
        </div>
        {drawer && (
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={props.onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-nav text-white/72 hover:bg-white/6 hover:text-white"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <nav aria-label="Módulos" className="contents">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            active={item.id === activeId}
            onNavigate={drawer ? props.onNavigate : undefined}
          />
        ))}
      </nav>
      <LogoutButton />
    </aside>
  );
}
