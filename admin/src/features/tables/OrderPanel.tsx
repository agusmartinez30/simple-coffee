import clsx from "clsx";
import Link from "next/link";
import { Armchair, Check, ChevronDown, MessageSquare, Minus, Plus, Search, X } from "lucide-react";
import {
  PRODUCT_SHORTCUTS,
  type DraftSummary,
  type OrderDraft,
  type ProductShortcut,
  type QuickProduct,
  type TableOption,
} from "./order-draft";

type OrderPanelProps = {
  draft: OrderDraft;
  summary: DraftSummary;
  tableOptions: readonly TableOption[];
  products: readonly QuickProduct[];
  shortcut: ProductShortcut;
  query: string;
  canAssign: boolean;
  assignLabel: string;
  onClose: () => void;
  onTableChange: (tableNumber: number | null) => void;
  onShortcutChange: (shortcut: ProductShortcut) => void;
  onQueryChange: (query: string) => void;
  onAdd: (productId: string) => void;
  onRemove: (productId: string) => void;
  onNoteChange: (note: string) => void;
  onAssign: () => void;
};

/**
 * "Cargar pedido" (02C): docked panel to load an order to a table — table selector, product search
 * with quick categories, the current order with its kitchen note and total, and "Asignar pedido".
 */
export function OrderPanel(props: OrderPanelProps) {
  const { draft, summary } = props;
  const hasTable = draft.tableNumber !== null;

  return (
    <aside
      aria-label="Cargar pedido"
      className="fixed top-[72px] right-0 bottom-0 z-20 flex w-[400px] flex-col gap-3.5 border-l border-line bg-surface px-5 pt-5 pb-[18px]"
    >
      <div className="flex w-full items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold tracking-[1px] whitespace-nowrap text-muted">NUEVO PEDIDO</p>
          <h3 className="text-[22px] font-bold whitespace-nowrap text-ink">Cargar pedido</h3>
        </div>
        <button
          type="button"
          aria-label="Cerrar panel"
          onClick={props.onClose}
          className="flex size-8 items-center justify-center rounded-nav text-ink outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      <label className="flex w-full flex-col gap-1.5">
        <span className="text-[11px] font-bold whitespace-nowrap text-muted">Mesa</span>
        <span
          className={clsx(
            "relative flex h-[42px] w-full items-center gap-2 rounded-nav px-3 outline-1 -outline-offset-[0.5px] focus-within:outline-2",
            hasTable ? "bg-brand-wash text-brand outline-brand" : "bg-cream text-muted outline-line focus-within:outline-brand",
          )}
        >
          <Armchair size={15} aria-hidden="true" className="shrink-0" />
          <select
            value={draft.tableNumber ?? ""}
            onChange={(event) => props.onTableChange(event.target.value === "" ? null : Number(event.target.value))}
            className="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-6 text-[12px] font-bold outline-none"
          >
            <option value="">Elegí una mesa</option>
            {props.tableOptions.map((option) => (
              <option key={option.number} value={option.number}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-3" />
        </span>
      </label>

      <section aria-label="Agregar productos" className="flex w-full flex-col gap-[9px]">
        <div className="flex w-full items-center justify-between">
          <h4 className="text-[13px] font-bold whitespace-nowrap text-ink">Agregar productos</h4>
          <Link href="/menu/products" className="text-[10px] font-bold whitespace-nowrap text-brand hover:underline">
            Ver menú completo →
          </Link>
        </div>
        <label className="flex h-[38px] w-full items-center gap-2 rounded-nav bg-cream px-[11px] outline-1 -outline-offset-[0.5px] outline-line focus-within:outline-2 focus-within:outline-brand">
          <Search size={14} aria-hidden="true" className="shrink-0 text-muted" />
          <input
            type="search"
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder="Buscar café, comida o extra…"
            aria-label="Buscar producto"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-ink outline-none placeholder:text-muted"
          />
        </label>
        <div role="group" aria-label="Categorías rápidas" className="flex gap-1.5">
          {PRODUCT_SHORTCUTS.map((shortcut) => {
            const active = shortcut.id === props.shortcut;
            return (
              <button
                key={shortcut.id}
                type="button"
                aria-pressed={active}
                onClick={() => props.onShortcutChange(shortcut.id)}
                className={clsx(
                  "rounded-[7px] px-[9px] py-1.5 text-[10px] font-semibold whitespace-nowrap outline-1 -outline-offset-[0.5px]",
                  active ? "bg-ink text-white outline-ink" : "bg-surface text-muted outline-line hover:text-ink",
                )}
              >
                {shortcut.label}
              </button>
            );
          })}
        </div>
        {props.products.length === 0 ? (
          <p className="py-3 text-[11px] text-muted">No encontramos productos.</p>
        ) : (
          // Four 46px rows with the export's 9px rhythm before the list scrolls.
          <ul className="flex max-h-[211px] flex-col gap-[9px] overflow-y-auto">
            {props.products.map((product) => (
              <li key={product.id} className="flex h-[46px] w-full items-center justify-between">
                <span className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-bold whitespace-nowrap text-ink">{product.name}</span>
                  <span className="text-[10px] whitespace-nowrap text-muted">{product.price}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Agregar ${product.name}`}
                  onClick={() => props.onAdd(product.id)}
                  className="mr-px flex size-[30px] items-center justify-center rounded-nav text-ink outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream"
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <span aria-hidden="true" className="h-px w-full shrink-0 bg-line" />

      <section aria-label="Pedido actual" className="flex min-h-0 w-full flex-col gap-2.5">
        <div className="flex w-full items-center justify-between">
          <h4 className="text-[13px] font-bold whitespace-nowrap text-ink">Pedido actual</h4>
          <p className="text-[10px] font-bold whitespace-nowrap text-brand">{summary.itemCount}</p>
        </div>
        {summary.lines.length === 0 ? (
          <p className="text-[11px] text-muted">Agregá productos para armar el pedido.</p>
        ) : (
          <ul className="flex min-h-0 flex-col gap-2.5 overflow-y-auto">
            {summary.lines.map((line) => (
              <li key={line.productId} className="flex w-full items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-[11px] font-bold whitespace-nowrap text-brand">{line.quantityLabel}</span>
                  <span className="truncate text-[11px] text-ink">{line.name}</span>
                </span>
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Quitar uno de ${line.name}`}
                    onClick={() => props.onRemove(line.productId)}
                    className="flex size-4 items-center justify-center rounded-[4px] text-muted hover:bg-cream hover:text-ink"
                  >
                    <Minus size={12} aria-hidden="true" />
                  </button>
                  <span className="text-[11px] font-bold whitespace-nowrap text-ink">{line.subtotal}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <label className="flex h-[42px] w-full shrink-0 items-center gap-2 rounded-nav bg-cream px-[11px] outline-1 -outline-offset-[0.5px] outline-line focus-within:outline-2 focus-within:outline-brand">
        <MessageSquare size={14} aria-hidden="true" className="shrink-0 text-muted" />
        <input
          type="text"
          value={draft.note}
          onChange={(event) => props.onNoteChange(event.target.value)}
          placeholder="Agregar nota para cocina…"
          aria-label="Nota para cocina"
          className="min-w-0 flex-1 bg-transparent text-[11px] text-ink outline-none placeholder:text-muted"
        />
      </label>

      <div className="flex w-full shrink-0 flex-col gap-2.5">
        <div className="flex w-full items-center justify-between">
          <p className="text-[12px] font-bold text-muted">Total</p>
          <p className="text-[18px] font-bold whitespace-nowrap text-ink">{summary.totalLabel}</p>
        </div>
        <button
          type="button"
          disabled={!props.canAssign}
          onClick={props.onAssign}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-nav bg-brand text-[12px] font-bold whitespace-nowrap text-white hover:bg-brand/92 disabled:cursor-not-allowed disabled:bg-brand/40"
        >
          <Check size={16} aria-hidden="true" />
          {props.assignLabel}
        </button>
      </div>
    </aside>
  );
}
