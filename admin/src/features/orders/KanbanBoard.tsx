"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import clsx from "clsx";
import { CornerDownRight, PanelRightOpen, SearchX, type LucideIcon } from "lucide-react";
import { getColumnTabs, type ColumnTab } from "./board-tabs";
import { formatOrderLocation, getElapsedBadge, getItemNote, isNewOrder } from "./order-alerts";
import { getPrimaryAction, type OrderColumn, type OrderColumnId } from "./orders-view";
import { Badge, ORDER_TONE_CLASSES } from "./OrderTags";
import type { Order } from "./order-types";

type OrderCardProps = {
  order: Order;
  now: string;
  selected: boolean;
  /** An advance or cancel of this order is in flight. */
  pending: boolean;
  onSelect: (id: string) => void;
  onAdvance: (id: string) => void;
};

/** "Pedido #NNNN": kitchen card. The whole card selects the order for the detail panel. */
function OrderCard({ order, now, selected, pending, onSelect, onAdvance }: OrderCardProps) {
  const action = getPrimaryAction(order);
  const elapsed = getElapsedBadge(order, now);
  const fresh = isNewOrder(order, now);

  return (
    <article
      aria-label={`Pedido #${order.number}`}
      className={clsx(
        "relative flex w-full shrink-0 flex-col gap-2.5 rounded-[10px] bg-surface p-3",
        selected
          ? "outline-2 -outline-offset-1 outline-brand"
          : "outline-1 -outline-offset-[0.5px] outline-line hover:outline-ink/30",
        fresh && "shadow-[0_3px_12px_#2f45ad22]",
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-[16px] leading-tight font-extrabold whitespace-nowrap text-ink">
            {/* Stretched button: the whole card selects the order; the actions sit above it. */}
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(order.id)}
              className="text-left after:absolute after:inset-0 after:rounded-[10px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-brand"
            >
              Pedido #{order.number}
            </button>
          </h3>
          <p className="text-[12px] font-bold text-brand">{formatOrderLocation(order)}</p>
        </div>
        <Badge tone={elapsed.tone}>{elapsed.label}</Badge>
      </div>
      {fresh && <Badge tone="brand">NUEVO</Badge>}
      <ul className="flex w-full flex-col gap-[7px]">
        {order.items.map((item) => {
          const note = getItemNote(item);
          return (
            <li key={item.id} className="flex w-full flex-col items-start gap-[3px]">
              <div className="flex w-full items-start gap-[7px] text-[12px] text-ink">
                <span className="font-extrabold whitespace-nowrap">{item.quantity}×</span>
                <span className="flex-1 font-bold">{item.name}</span>
              </div>
              {note && (
                <p className="flex items-center gap-[5px] rounded-[5px] bg-warning-bg px-[7px] py-1 text-[10px] text-warning">
                  <CornerDownRight size={11} aria-hidden="true" className="shrink-0" />
                  {note}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex w-full items-center gap-[7px]">
        {action ? (
          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={() => onAdvance(order.id)}
            className={clsx(
              "relative z-[1] flex h-11 flex-1 items-center justify-center rounded-[7px] text-[11px] font-extrabold whitespace-nowrap text-white disabled:cursor-wait disabled:opacity-60 lg:h-[34px]",
              ORDER_TONE_CLASSES[action.tone].solid,
            )}
          >
            {action.label}
          </button>
        ) : (
          <span className="flex h-11 flex-1 items-center justify-center rounded-[7px] bg-success-bg lg:h-[34px] text-[11px] font-extrabold text-success">
            Entregado
          </span>
        )}
        <button
          type="button"
          aria-label={`Ver detalle del pedido #${order.number}`}
          onClick={() => onSelect(order.id)}
          className="relative z-[1] flex size-11 shrink-0 items-center justify-center rounded-[7px] text-muted outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream lg:size-[34px]"
        >
          <PanelRightOpen size={15} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

const COLUMN_BACKGROUNDS: Record<OrderColumnId, string> = {
  received: "bg-[#f0f2fb]",
  preparing: "bg-[#fbf5e9]",
  delivered: "bg-[#eef6f0]",
};

/** True while the list overflows and is not scrolled to its end. */
function useMoreBelow(ref: RefObject<HTMLElement | null>): boolean {
  const [moreBelow, setMoreBelow] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setMoreBelow(element.scrollTop + element.clientHeight < element.scrollHeight - 1);
    // The observer reports the first size right away, so no synchronous measure is needed.
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    element.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, [ref]);
  return moreBelow;
}

type KanbanColumnProps = Omit<OrderCardProps, "order" | "selected" | "pending"> & {
  column: OrderColumn;
  selectedId: string | null;
  pendingIds: readonly string[];
};

/**
 * "Columna · …": tinted column with its dot, title, count and scrolling cards. Below `lg` only the
 * `shown` column renders (the one of the selected tab); from `lg` every column does.
 */
function KanbanColumn({ column, selectedId, pendingIds, shown, ...cardProps }: KanbanColumnProps & { shown: boolean }) {
  const listRef = useRef<HTMLDivElement>(null);
  const moreBelow = useMoreBelow(listRef);
  const tone = ORDER_TONE_CLASSES[column.tone];

  return (
    <section
      id={`orders-panel-${column.id}`}
      aria-labelledby={`orders-column-${column.id}`}
      className={clsx(
        "h-full min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-hidden rounded-card p-2.5",
        shown ? "flex" : "hidden lg:flex",
        COLUMN_BACKGROUNDS[column.id],
      )}
    >
      <div className="flex w-full shrink-0 items-center justify-between">
        <div className="flex items-center gap-[7px]">
          <span aria-hidden="true" className={clsx("size-[9px] rounded-full", tone.dot)} />
          <h2 id={`orders-column-${column.id}`} className="text-[13px] font-extrabold whitespace-nowrap text-ink">
            {column.title}
          </h2>
        </div>
        <Badge tone={column.tone} className="bg-surface!">
          <span className="sr-only">Pedidos: </span>
          {column.orders.length}
        </Badge>
      </div>
      <div ref={listRef} className="-m-1 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-1">
        {column.orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            selected={order.id === selectedId}
            pending={pendingIds.includes(order.id)}
            {...cardProps}
          />
        ))}
      </div>
      {moreBelow && (
        <button
          type="button"
          onClick={() => listRef.current?.scrollBy({ top: listRef.current.clientHeight * 0.8, behavior: "smooth" })}
          className="flex h-7 w-full shrink-0 items-center justify-center rounded-[7px] bg-surface/80 text-[10px] font-bold text-muted hover:bg-surface"
        >
          Desplazar para ver más ↓
        </button>
      )}
    </section>
  );
}

export type BoardEmptyState = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
};

type ColumnTabsProps = {
  tabs: readonly ColumnTab[];
  activeId: OrderColumnId | null;
  onChange: (id: OrderColumnId) => void;
};

/** Status tabs of the mobile board ("Recibidos 3"); hidden from `lg`, where every column shows. */
function ColumnTabs({ tabs, activeId, onChange }: ColumnTabsProps) {
  return (
    <div role="group" aria-label="Estado de los pedidos" className="flex w-full shrink-0 gap-1.5 overflow-x-auto lg:hidden">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={active}
            aria-controls={`orders-panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={clsx(
              "flex h-11 shrink-0 items-center gap-2 rounded-nav px-3 text-[12px] font-bold whitespace-nowrap outline-1 -outline-offset-[0.5px]",
              active ? "bg-ink text-white outline-ink" : "bg-surface text-muted outline-line hover:bg-cream",
            )}
          >
            <span aria-hidden="true" className={clsx("size-2 rounded-full", ORDER_TONE_CLASSES[tab.tone].dot)} />
            {tab.label}
            <span className={clsx("text-[11px]", active ? "text-white/72" : "text-ink")}>{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}

type KanbanBoardProps = Omit<KanbanColumnProps, "column"> & {
  columns: OrderColumn[];
  emptyState: BoardEmptyState | null;
  /** Column shown below `lg`, picked by the container (see `pickActiveTab`). */
  activeColumnId: OrderColumnId | null;
  onActiveColumnChange: (id: OrderColumnId) => void;
};

/**
 * "Tablero de estados": one column per kitchen stage, or an empty state when nothing matches.
 * Below `lg` status tabs pick the single column on screen.
 */
export function KanbanBoard({
  columns,
  emptyState,
  activeColumnId,
  onActiveColumnChange,
  ...columnProps
}: KanbanBoardProps) {
  if (emptyState) {
    const EmptyIcon = emptyState.icon ?? SearchX;
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-card bg-surface p-10 text-center outline-1 -outline-offset-[0.5px] outline-line">
        <EmptyIcon size={28} aria-hidden="true" className="text-muted" />
        <p className="text-[14px] font-bold text-ink">{emptyState.title}</p>
        <p className="text-[12px] text-muted">{emptyState.description}</p>
        {emptyState.action && (
          <button
            type="button"
            onClick={emptyState.action.onClick}
            className="mt-1 text-[12px] font-bold text-brand hover:underline"
          >
            {emptyState.action.label}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2.5 lg:flex-row">
      <ColumnTabs tabs={getColumnTabs(columns)} activeId={activeColumnId} onChange={onActiveColumnChange} />
      {columns.map((column) => (
        <KanbanColumn key={column.id} column={column} shown={column.id === activeColumnId} {...columnProps} />
      ))}
    </div>
  );
}
