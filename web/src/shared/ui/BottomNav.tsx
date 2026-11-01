import Link from "next/link";
import { Compass, ConciergeBell, type LucideIcon } from "lucide-react";
import clsx from "clsx";

export type BottomNavTab = "explorar" | "mesa";

const TABS: { id: BottomNavTab; label: string; href: string; icon: LucideIcon }[] = [
  { id: "explorar", label: "Explorar", href: "/explore", icon: Compass },
  { id: "mesa", label: "Mi mesa", href: "/table", icon: ConciergeBell },
];

type BottomNavProps = {
  active: BottomNavTab;
  className?: string;
};

/** Floating pill navigation; the active tab expands to show its label. */
export function BottomNav({ active, className }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className={clsx(
        "flex h-[54px] w-full items-center justify-around rounded-[27px] bg-cream p-1.5 shadow-nav outline-[1.5px] -outline-offset-[0.75px] outline-brand outline-solid",
        className,
      )}
    >
      {TABS.map(({ id, label, href, icon: Icon }) => {
        const isActive = id === active;
        return (
          <Link
            key={id}
            href={href}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={clsx(
              "flex h-10 w-[104px] shrink-0 items-center justify-center gap-1.5 rounded-[20px] transition-colors",
              isActive ? "bg-brand text-white" : "text-brand active:bg-brand-soft",
            )}
          >
            <Icon size={22} aria-hidden="true" />
            {isActive ? <span className="text-[10px] font-bold">{label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
