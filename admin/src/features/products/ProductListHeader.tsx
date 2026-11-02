import { Plus } from "lucide-react";

/**
 * "Commerce Header": breadcrumb, title, subtitle and "New Product". Below `lg` the button stacks
 * under the title as a full-width 44px action.
 */
export function ProductListHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <header className="flex w-full shrink-0 flex-col gap-3 lg:h-[70px] lg:flex-row lg:items-center lg:justify-between lg:gap-0">
      <div className="flex flex-col gap-[3px]">
        <p className="text-[11px] font-bold whitespace-nowrap text-brand">Carta digital / Productos</p>
        <h2 className="text-[20px] leading-tight font-bold whitespace-nowrap text-ink lg:text-[26px]">Gestión de productos</h2>
        <p className="text-[12px] text-muted lg:whitespace-nowrap">Precio, visibilidad y disponibilidad en una sola vista</p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="flex h-11 w-full items-center justify-center gap-[7px] rounded-field bg-brand px-[15px] text-white hover:bg-brand/92 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:h-10 lg:w-auto"
      >
        <Plus size={15} aria-hidden="true" className="shrink-0" />
        <span className="text-[12px] font-bold whitespace-nowrap">Nuevo producto</span>
      </button>
    </header>
  );
}
