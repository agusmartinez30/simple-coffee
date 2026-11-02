"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, LoaderCircle, MessageSquareText, RotateCw, Send, TriangleAlert, X } from "lucide-react";
import { Drawer, Notice, PrimaryButton } from "@/shared/ui";
import { formatPrice } from "@/shared/lib/format-price";
import type { Order } from "../order-types";
import { canSubmitCart, cartItemCount, cartTotal, ORDER_NOTE_MAX_LENGTH } from "./cart";
import { CartSummary } from "./CartSummary";
import { describeTable, filterEntryProducts, submitLabel } from "./entry-view";
import type { EntryProduct, EntryTable } from "./entry-types";
import { OptionPickerDialog } from "./OptionPickerDialog";
import { ProductPicker } from "./ProductPicker";
import { useOrderEntry } from "./use-order-entry";

type NewOrderPanelProps = {
  onClose: () => void;
  /** The order the API created; the board adds and selects it. */
  onCreated: (order: Order) => void;
};

/** Enabled tables under one `<optgroup>` per space, in space order. */
function groupBySpace(tables: readonly EntryTable[]): { spaceName: string; tables: EntryTable[] }[] {
  const groups: { spaceName: string; tables: EntryTable[] }[] = [];
  for (const table of tables) {
    const group = groups.at(-1);
    if (group && group.spaceName === table.spaceName) group.tables.push(table);
    else groups.push({ spaceName: table.spaceName, tables: [table] });
  }
  return groups;
}

function TablePicker({
  tables,
  value,
  onChange,
  disabled,
}: {
  tables: readonly EntryTable[];
  value: number | null;
  onChange: (tableNumber: number | null) => void;
  disabled: boolean;
}) {
  const selected = value !== null;
  return (
    <label className="flex w-full flex-col gap-1.5">
      <span className="text-[11px] font-bold text-muted">Mesa</span>
      <span
        className={
          selected
            ? "relative flex h-[42px] w-full items-center rounded-nav bg-brand-wash outline-1 -outline-offset-[0.5px] outline-brand focus-within:outline-2 focus-within:-outline-offset-1"
            : "relative flex h-[42px] w-full items-center rounded-nav bg-surface outline-1 -outline-offset-[0.5px] outline-line focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-brand"
        }
      >
        <select
          value={value ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
          className={`h-full w-full cursor-pointer appearance-none bg-transparent pr-10 pl-3 text-[12px] font-bold outline-none disabled:cursor-not-allowed ${selected ? "text-brand" : "text-muted"}`}
        >
          <option value="">Elegí una mesa</option>
          {groupBySpace(tables).map((group) => (
            <optgroup key={group.spaceName || "sin-espacio"} label={group.spaceName || "Sin espacio"}>
              {group.tables.map((table) => (
                <option key={table.number} value={table.number}>
                  {describeTable(table)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden="true" className={`pointer-events-none absolute right-3 ${selected ? "text-brand" : "text-muted"}`} />
      </span>
      {tables.length === 0 && <span className="text-[10px] text-muted">No hay mesas habilitadas.</span>}
    </label>
  );
}

/**
 * "Nuevo pedido · Cargar pedido" (modeled on 02C): side panel over the orders board. Container:
 * `useOrderEntry` owns the catalog, the cart and the submission; this component owns the search,
 * the category chip and the option picker.
 */
export function NewOrderPanel({ onClose, onCreated }: NewOrderPanelProps) {
  const titleId = useId();
  const { catalog, retryCatalog, cart, update, submitting, error, dismissError, submit } = useOrderEntry({ onCreated });
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [picking, setPicking] = useState<EntryProduct | null>(null);

  const visibleProducts = useMemo(
    () => (catalog.status === "ready" ? filterEntryProducts(catalog.catalog.products, { query, categoryId }) : []),
    [catalog, query, categoryId],
  );
  const categories = useMemo(() => {
    if (catalog.status !== "ready") return [];
    const used = new Set(catalog.catalog.products.map((product) => product.categoryId));
    return catalog.catalog.categories.filter((category) => used.has(category.id));
  }, [catalog]);

  const pick = (product: EntryProduct) => {
    if (product.optionGroups.length === 0) update({ type: "add", product, optionIds: [] });
    else setPicking(product);
  };

  // While the order is sent, a click elsewhere must not drop it half-way; Escape waits too.
  const close = () => {
    if (!submitting) onClose();
  };

  return (
    <>
      <Drawer labelledBy={titleId} onClose={close}>
        <header className="flex w-full shrink-0 items-start justify-between px-5 pt-5 pb-3.5">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold tracking-[1px] text-muted">NUEVO PEDIDO</p>
            <h2 id={titleId} className="text-[22px] font-bold text-ink">
              Cargar pedido
            </h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            disabled={submitting}
            className="flex size-8 items-center justify-center rounded-nav text-muted outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream hover:text-ink disabled:cursor-not-allowed"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        {catalog.status === "loading" && (
          <p role="status" className="flex flex-1 items-center justify-center gap-2 text-[12px] font-semibold text-muted">
            <LoaderCircle size={16} aria-hidden="true" className="animate-spin" />
            Cargando carta y mesas…
          </p>
        )}

        {catalog.status === "failed" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5">
            <Notice tone="danger" icon={TriangleAlert}>
              {catalog.message}
            </Notice>
            <button
              type="button"
              onClick={retryCatalog}
              className="flex h-10 items-center gap-1.5 rounded-[9px] px-3 text-[12px] font-bold text-brand hover:bg-brand-wash"
            >
              <RotateCw size={14} aria-hidden="true" />
              Reintentar
            </button>
          </div>
        )}

        {catalog.status === "ready" && (
          <>
            <div className="flex min-h-0 w-full flex-1 flex-col gap-3.5 overflow-y-auto px-5 pb-3.5">
              <TablePicker
                tables={catalog.catalog.tables}
                value={cart.tableNumber}
                onChange={(tableNumber) => update({ type: "select-table", tableNumber })}
                disabled={submitting}
              />
              <ProductPicker
                products={visibleProducts}
                categories={categories}
                query={query}
                onQueryChange={setQuery}
                categoryId={categoryId}
                onCategoryChange={setCategoryId}
                onPick={pick}
                disabled={submitting}
              />
              <hr className="w-full border-line" />
              <CartSummary lines={cart.lines} itemCount={cartItemCount(cart.lines)} onChange={update} disabled={submitting} />
              <label className="flex min-h-[42px] w-full shrink-0 items-center gap-2 rounded-nav bg-cream px-[11px] outline-1 -outline-offset-[0.5px] outline-line focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-brand">
                <MessageSquareText size={14} aria-hidden="true" className="shrink-0 text-muted" />
                <span className="sr-only">Nota para cocina</span>
                <input
                  type="text"
                  value={cart.note}
                  maxLength={ORDER_NOTE_MAX_LENGTH}
                  disabled={submitting}
                  onChange={(event) => update({ type: "set-note", note: event.target.value })}
                  placeholder="Agregar nota para cocina…"
                  className="min-w-0 flex-1 bg-transparent text-[11px] text-ink outline-none placeholder:text-muted"
                />
              </label>
            </div>

            <footer className="flex w-full shrink-0 flex-col gap-2.5 border-t border-line px-5 pt-3.5 pb-[18px]">
              {error && (
                <div className="flex w-full items-center gap-2">
                  <Notice tone="danger" icon={TriangleAlert} className="flex-1">
                    {error}
                  </Notice>
                  <button
                    type="button"
                    aria-label="Cerrar aviso"
                    onClick={dismissError}
                    className="flex size-8 shrink-0 items-center justify-center rounded-nav text-muted hover:bg-cream"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
              <div className="flex w-full items-center justify-between">
                <span className="text-[12px] font-bold text-muted">Total</span>
                <span className="text-[18px] font-bold text-ink">{formatPrice(cartTotal(cart.lines))}</span>
              </div>
              <PrimaryButton
                icon={Send}
                onClick={submit}
                disabled={!canSubmitCart(cart)}
                loading={submitting}
                className="h-11 rounded-nav text-[12px]"
              >
                {submitting ? "Asignando pedido…" : submitLabel(cart.tableNumber)}
              </PrimaryButton>
            </footer>
          </>
        )}
      </Drawer>
      {picking && (
        <OptionPickerDialog
          key={picking.id}
          product={picking}
          onClose={() => setPicking(null)}
          onAdd={(optionIds) => {
            update({ type: "add", product: picking, optionIds });
            setPicking(null);
          }}
        />
      )}
    </>
  );
}
