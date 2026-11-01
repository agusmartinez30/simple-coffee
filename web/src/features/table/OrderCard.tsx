import { ChevronDown, ChevronUp } from "lucide-react";
import { getLineTotal, getOrderTotal } from "@/mocks/table";
import type { OrderStatus, TableOrder } from "@/mocks/types";
import { formatPrice } from "@/shared/lib/format-price";
import { StatusPill, type StatusPillTone } from "@/shared/ui";

type OrderCardProps = {
  order: TableOrder;
  expanded: boolean;
  onToggle: () => void;
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  sent: "Recibido",
  preparing: "En preparación",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

/** Order badge tones on screen 07 ("En preparación" is brand blue there). */
const STATUS_TONES: Record<OrderStatus, StatusPillTone> = {
  sent: "neutral",
  preparing: "info",
  delivered: "success",
  cancelled: "danger",
};

/** Expandable order of the table history: number, customer, time, status, lines and total. */
export function OrderCard({ order, expanded, onToggle }: OrderCardProps) {
  const total = getOrderTotal(order);
  const detailsId = `order-${order.id}-details`;
  const meta = [order.customerName, `${order.time} hs`, expanded ? null : formatPrice(total)]
    .filter(Boolean)
    .join(" · ");
  const Toggle = expanded ? ChevronUp : ChevronDown;

  return (
    <article className="w-full overflow-hidden rounded-[15px] bg-surface outline-1 -outline-offset-[0.5px] outline-line outline-solid">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="flex h-[54px] w-full items-center justify-between px-3.5 text-left"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-[12.5px] font-bold text-ink">#{order.number}</span>
          <span className="text-[9.5px] text-muted">{meta}</span>
        </span>
        <span className="flex items-center gap-2">
          <StatusPill tone={STATUS_TONES[order.status]}>{ORDER_STATUS_LABELS[order.status]}</StatusPill>
          <Toggle size={18} className="text-muted" aria-hidden="true" />
        </span>
      </button>
      {expanded ? (
        <div id={detailsId} className="border-t border-line px-4 pt-1 pb-2">
          <ul>
            {order.lines.map((line, index) => (
              <li key={`${line.productId}-${index}`} className="flex min-h-[34px] items-center justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="text-[10.5px] font-bold text-ink">
                    {line.quantity} × {line.name}
                  </span>
                  {line.customization ? (
                    <span className="text-[8.5px] text-muted">{line.customization}</span>
                  ) : null}
                </span>
                <span className="text-[10.5px] font-bold text-ink">{formatPrice(getLineTotal(line))}</span>
              </li>
            ))}
          </ul>
          <div className="flex h-6 items-end justify-between border-t border-line">
            <span className="text-[9.5px] font-bold text-muted">Total del pedido</span>
            <span className="text-[11.5px] font-bold text-brand">{formatPrice(total)}</span>
          </div>
        </div>
      ) : null}
    </article>
  );
}
