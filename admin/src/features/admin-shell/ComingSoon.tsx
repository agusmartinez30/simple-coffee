import Link from "next/link";
import { Clock3 } from "lucide-react";
import { getNavItem } from "./navigation";

type ComingSoonProps = {
  /** `NavItem.id` of the module that is not built yet. */
  moduleId: string;
};

/** Shared placeholder for modules that are not part of the prototype yet. */
export function ComingSoon({ moduleId }: ComingSoonProps) {
  const item = getNavItem(moduleId);
  const Icon = item?.icon ?? Clock3;

  return (
    <section className="flex flex-1 items-center justify-center px-6 py-3.5">
      <div className="flex w-[420px] flex-col items-center gap-3 rounded-card bg-surface p-10 text-center outline-1 -outline-offset-[0.5px] outline-line">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-wash text-brand">
          <Icon size={22} aria-hidden="true" />
        </span>
        <p className="text-[11px] font-bold tracking-[0.5px] text-brand">PRÓXIMAMENTE</p>
        <h2 className="text-[25px] font-bold text-ink">{item?.label ?? "Módulo"}</h2>
        <p className="text-[13px]/[19px] text-muted">
          Este módulo todavía no está disponible en el prototipo.
        </p>
        {moduleId !== "orders" && (
          <Link href="/orders" className="text-[12px] font-bold text-brand hover:underline">
            Volver a pedidos →
          </Link>
        )}
      </div>
    </section>
  );
}
