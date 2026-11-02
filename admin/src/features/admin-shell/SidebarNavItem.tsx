import Link from "next/link";
import clsx from "clsx";
import type { NavItem } from "./navigation";

type SidebarNavItemProps = {
  item: NavItem;
  active: boolean;
  /** Called when the link is followed (the mobile menu closes itself). */
  onNavigate?: () => void;
};

/** Sidebar link: 40px in the desktop rail, 44px touch target in the mobile menu. */
export function SidebarNavItem({ item, active, onNavigate }: SidebarNavItemProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={clsx(
        "flex h-11 w-full lg:h-[40px] shrink-0 items-center gap-2.5 rounded-nav px-2.5 text-[13px] whitespace-nowrap transition-colors",
        active
          ? "bg-brand font-bold text-white"
          : "font-medium text-white/72 hover:bg-white/6 hover:text-white",
      )}
    >
      <Icon
        size={16}
        aria-hidden="true"
        className={clsx("shrink-0", active ? "text-white" : "text-white/60")}
      />
      <span>{item.label}</span>
    </Link>
  );
}
