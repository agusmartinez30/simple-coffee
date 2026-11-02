import { Minus, Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@/shared/lib/format-price";
import { LINE_NOTE_MAX_LENGTH, LINE_QUANTITY_MAX, LINE_QUANTITY_MIN, type CartAction, type CartLine } from "./cart";
import { formatItemCount } from "./entry-view";

type CartSummaryProps = {
  lines: readonly CartLine[];
  itemCount: number;
  onChange: (action: CartAction) => void;
  disabled?: boolean;
};

const ICON_BUTTON =
  "flex size-6 shrink-0 items-center justify-center rounded-[6px] text-ink outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40";

/** "Pedido actual": one row per line with quantity steppers, subtotal, remove and its note when allowed. */
export function CartSummary({ lines, itemCount, onChange, disabled = false }: CartSummaryProps) {
  return (
    <section aria-labelledby="order-entry-cart" className="flex w-full flex-col gap-2.5">
      <div className="flex w-full items-center justify-between">
        <h3 id="order-entry-cart" className="text-[13px] font-bold text-ink">
          Pedido actual
        </h3>
        <span className="text-[10px] font-bold text-brand" aria-live="polite">
          {formatItemCount(itemCount)}
        </span>
      </div>
      {lines.length === 0 ? (
        <p className="rounded-nav bg-cream px-3 py-3 text-[11px] text-muted">Agregá productos para armar el pedido.</p>
      ) : (
        <ul className="flex w-full flex-col gap-2.5">
          {lines.map((line) => (
            <li key={line.key} className="flex w-full flex-col gap-1.5">
              <div className="flex w-full items-center gap-2">
                <span className="w-7 shrink-0 text-[11px] font-bold text-brand">{line.quantity}×</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[11px] text-ink">{line.name}</span>
                  {line.optionSummary && <span className="truncate text-[10px] text-muted">{line.optionSummary}</span>}
                </span>
                <span className="text-[11px] font-bold whitespace-nowrap text-ink">{formatPrice(line.unitPrice * line.quantity)}</span>
              </div>
              <div className="flex w-full items-center gap-1.5 pl-9">
                <button
                  type="button"
                  aria-label={`Quitar una unidad de ${line.name}`}
                  disabled={disabled || line.quantity <= LINE_QUANTITY_MIN}
                  onClick={() => onChange({ type: "decrement", key: line.key })}
                  className={ICON_BUTTON}
                >
                  <Minus size={12} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Sumar una unidad de ${line.name}`}
                  disabled={disabled || line.quantity >= LINE_QUANTITY_MAX}
                  onClick={() => onChange({ type: "increment", key: line.key })}
                  className={ICON_BUTTON}
                >
                  <Plus size={12} aria-hidden="true" />
                </button>
                {line.allowsNote ? (
                  <label className="flex h-6 min-w-0 flex-1 items-center rounded-[6px] bg-cream px-2 focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-brand">
                    <span className="sr-only">Nota para {line.name}</span>
                    <input
                      type="text"
                      value={line.note}
                      maxLength={LINE_NOTE_MAX_LENGTH}
                      disabled={disabled}
                      onChange={(event) => onChange({ type: "set-line-note", key: line.key, note: event.target.value })}
                      placeholder="Nota para esta línea…"
                      className="min-w-0 flex-1 bg-transparent text-[10px] text-ink outline-none placeholder:text-muted"
                    />
                  </label>
                ) : (
                  <span className="flex-1" />
                )}
                <button
                  type="button"
                  aria-label={`Quitar ${line.name} del pedido`}
                  disabled={disabled}
                  onClick={() => onChange({ type: "remove", key: line.key })}
                  className="flex size-6 shrink-0 items-center justify-center rounded-[6px] text-muted hover:bg-danger-bg hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
