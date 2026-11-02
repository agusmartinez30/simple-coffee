import clsx from "clsx";
import type { ReactNode } from "react";
import { CircleX, PanelRightOpen, Sparkles, TriangleAlert, X } from "lucide-react";
import {
  DELAY_TARGET_MINUTES,
  formatOrderLocation,
  formatReceivedLine,
  getItemNote,
  getOrderTimeline,
  getPanelAction,
  isOrderDelayed,
} from "./order-alerts";
import { canCancelOrder, getStatusBadge } from "./orders-view";
import { Drawer } from "@/shared/ui";
import { Badge, ORDER_TONE_CLASSES } from "./OrderTags";
import type { Order } from "./order-types";

/** Desktop panel; hidden below `lg`, where the detail opens as a sheet instead. */
const PANEL_CLASSES =
  "hidden h-full min-h-0 w-[362px] shrink-0 flex-col gap-3.5 overflow-y-auto rounded-card bg-surface p-[18px] shadow-[-4px_0_18px_#10101016] outline-1 -outline-offset-[0.5px] outline-line lg:flex";

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-[10px] font-extrabold tracking-[1px] whitespace-nowrap text-muted">{children}</h3>;
}

type OrderDetailPanelProps = {
  order: Order | null;
  now: string;
  /** An advance or cancel of the order is in flight: its actions stay disabled. */
  pending?: boolean;
  onClose: () => void;
  onAdvance: (id: string) => void;
  onRequestCancel: (id: string) => void;
  /**
   * `panel` (default): persistent panel beside the board, from `lg`. `sheet`: full-width dialog
   * over the board below `lg`; it renders nothing without an order.
   */
  layout?: "panel" | "sheet";
};

/**
 * "Drawer · Detalle Pedido": persistent panel to the right of the board with the selected
 * order's products, timeline, delay alert and actions. "Cerrar detalle" clears the selection.
 * Below `lg` the same content opens as a sheet (dialog: focus trap, Escape closes).
 */
export function OrderDetailPanel({
  order,
  now,
  pending = false,
  onClose,
  onAdvance,
  onRequestCancel,
  layout = "panel",
}: OrderDetailPanelProps) {
  if (!order) {
    if (layout === "sheet") return null;
    return (
      <aside aria-label="Detalle del pedido" className={clsx(PANEL_CLASSES, "items-center justify-center text-center")}>
        <PanelRightOpen size={26} aria-hidden="true" className="text-muted" />
        <p className="text-[13px] font-bold text-ink">Ningún pedido seleccionado</p>
        <p className="text-[12px] text-muted">Elegí un pedido del tablero para ver su detalle.</p>
      </aside>
    );
  }

  const badge = getStatusBadge(order.status);
  const action = getPanelAction(order);
  const received = formatReceivedLine(order, now);
  const titleId = `order-detail-${order.id}`;

  const frame = (children: ReactNode) =>
    layout === "sheet" ? (
      <Drawer labelledBy={titleId} onClose={onClose} className="w-full">
        <div className="flex min-h-0 w-full flex-1 flex-col gap-3.5 overflow-y-auto p-4">{children}</div>
      </Drawer>
    ) : (
      <aside aria-labelledby={titleId} className={PANEL_CLASSES}>
        {children}
      </aside>
    );

  return frame(
    <>
      <div className="flex w-full shrink-0 items-start justify-between">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-[20px] leading-tight font-extrabold whitespace-nowrap text-ink">
            Pedido #{order.number}
          </h2>
          <Badge tone={badge.tone} className="uppercase">
            {badge.label}
          </Badge>
        </div>
        <button
          type="button"
          aria-label="Cerrar detalle"
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-nav bg-cream text-ink hover:bg-sand lg:size-8"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-[5px] rounded-nav bg-cream p-3">
        <p className="text-[14px] font-extrabold text-ink">{formatOrderLocation(order)}</p>
        <p className={clsx("text-[11px] font-bold", received.delayed ? "text-danger" : "text-muted")}>
          {received.label}
        </p>
      </div>
      <SectionTitle>PRODUCTOS</SectionTitle>
      <ul className="flex w-full shrink-0 flex-col gap-2">
        {order.items.map((item) => {
          const note = getItemNote(item);
          return (
            <li key={item.id} className="flex w-full flex-col gap-1.5">
              <div className="flex w-full items-start gap-2 text-[13px] text-ink">
                <span className="font-extrabold">{item.quantity}×</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold">{item.name}</span>
                  {item.variant && <span className="text-[11px] text-muted">{item.variant}</span>}
                </div>
              </div>
              {note && (
                <p className="flex w-full items-start gap-[7px] rounded-[6px] bg-warning-bg p-2 text-[11px] text-warning">
                  <Sparkles size={14} aria-hidden="true" className="shrink-0" />
                  <span className="flex-1">{note}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {order.note && (
        <div className="flex w-full shrink-0 flex-col gap-[3px] rounded-[6px] bg-cream p-2">
          <p className="text-[9px] font-extrabold tracking-[1px] text-muted">NOTA DEL CLIENTE</p>
          <p className="text-[11px] text-ink">{order.note}</p>
        </div>
      )}
      <SectionTitle>CRONOLOGÍA</SectionTitle>
      <ol className="flex w-full shrink-0 flex-col gap-[11px]">
        {getOrderTimeline(order, now).map((entry) => {
          const tone = ORDER_TONE_CLASSES[entry.tone];
          return (
            <li key={entry.id} className="flex w-full items-center gap-[9px]">
              <span aria-hidden="true" className={clsx("size-2 shrink-0 rounded-full", tone.dot)} />
              <span className="text-[10px] font-bold whitespace-nowrap text-muted">{entry.time}</span>
              <span className={clsx("text-[11px] font-semibold", tone.text)}>{entry.label}</span>
            </li>
          );
        })}
      </ol>
      <div className="flex-1" />
      {isOrderDelayed(order, now) && (
        <p className="flex w-full shrink-0 items-center gap-[7px] rounded-[7px] bg-danger-bg p-[9px] text-[10px] font-bold text-danger">
          <TriangleAlert size={15} aria-hidden="true" className="shrink-0" />
          Supera el tiempo objetivo de {DELAY_TARGET_MINUTES} min
        </p>
      )}
      {canCancelOrder(order) && (
        <button
          type="button"
          disabled={pending}
          onClick={() => onRequestCancel(order.id)}
          className="flex h-11 w-full shrink-0 items-center justify-center gap-[7px] rounded-nav bg-surface lg:h-9 text-[11px] font-extrabold text-danger outline-1 -outline-offset-[0.5px] outline-danger hover:bg-danger-bg disabled:cursor-wait disabled:opacity-60"
        >
          <CircleX size={14} aria-hidden="true" className="shrink-0" />
          Cancelar pedido
        </button>
      )}
      {action && (
        <button
          type="button"
          disabled={pending}
          aria-busy={pending}
          onClick={() => onAdvance(order.id)}
          className={clsx(
            "flex h-11 w-full shrink-0 items-center justify-center rounded-nav text-[12px] lg:h-[42px] font-extrabold text-white disabled:cursor-wait disabled:opacity-60",
            ORDER_TONE_CLASSES[action.tone].solid,
          )}
        >
          {action.label}
        </button>
      )}
    </>,
  );
}
