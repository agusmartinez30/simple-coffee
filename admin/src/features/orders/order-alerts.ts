import type { Order, OrderHistoryEvent, OrderItem } from "./order-types";
import { minutesBetween } from "./service-clock";
import { countOrdersByColumn, formatTableLabel, type OrderColumnId, type OrderTone } from "./orders-view";

/**
 * Time-aware helpers of the optimized 03 board. Every function takes the local "HH:MM" `now`
 * explicitly (the container's clock in the service time zone), so the helpers stay deterministic.
 */

/** Kitchen target: an unfinished order older than this is "Demorado". */
export const DELAY_TARGET_MINUTES = 20;

/** Received orders carry the "NUEVO" badge for this long. */
export const NEW_ORDER_WINDOW_MINUTES = 5;

/** Delivered orders stay on the board this long, then leave it. */
export const DELIVERED_BOARD_WINDOW_MINUTES = 30;

function isUnfinished(order: Order): boolean {
  return order.status === "received" || order.status === "preparing";
}

/** Whole minutes since the order was received; never negative. */
export function getOrderElapsedMinutes(order: Order, now: string): number {
  return Math.max(0, minutesBetween(order.receivedAt, now));
}

/** Minutes past the target for unfinished orders, 0 when on time or finished. */
export function getOrderDelayMinutes(order: Order, now: string): number {
  if (!isUnfinished(order)) return 0;
  return Math.max(0, getOrderElapsedMinutes(order, now) - DELAY_TARGET_MINUTES);
}

export function isOrderDelayed(order: Order, now: string): boolean {
  return getOrderDelayMinutes(order, now) > 0;
}

export function isNewOrder(order: Order, now: string): boolean {
  return order.status === "received" && getOrderElapsedMinutes(order, now) <= NEW_ORDER_WINDOW_MINUTES;
}

/** "hace 6 min", or "ahora" in the first minute. */
export function formatElapsed(minutes: number): string {
  return minutes < 1 ? "ahora" : `hace ${minutes} min`;
}

export type ElapsedTone = "neutral" | "danger" | "success";

/** Card time badge: red once delayed, green once delivered, neutral otherwise. */
export function getElapsedBadge(order: Order, now: string): { label: string; tone: ElapsedTone } {
  const label = formatElapsed(getOrderElapsedMinutes(order, now));
  if (isOrderDelayed(order, now)) return { label, tone: "danger" };
  return { label, tone: order.status === "delivered" ? "success" : "neutral" };
}

/** Detail panel line: "Recibido 14:04 · hace 38 min", red when delayed. */
export function formatReceivedLine(order: Order, now: string): { label: string; delayed: boolean } {
  return {
    label: `Recibido ${order.receivedAt} · ${formatElapsed(getOrderElapsedMinutes(order, now))}`,
    delayed: isOrderDelayed(order, now),
  };
}

export type AlertMetric = {
  id: OrderColumnId;
  label: string;
  value: number;
  /** Context sublabel: "1 nuevo", "1 demorado", "últimos 30 min". */
  detail: string;
  tone: OrderTone;
};

const plural = (count: number, singular: string) => `${count} ${singular}${count === 1 ? "" : "s"}`;

/** "Resumen operativo": one tile per kitchen stage with its alert sublabel. */
export function getAlertMetrics(orders: readonly Order[], now: string): AlertMetric[] {
  const counts = countOrdersByColumn(orders);
  const fresh = orders.filter((order) => isNewOrder(order, now)).length;
  const late = orders.filter((order) => order.status === "preparing" && isOrderDelayed(order, now)).length;
  return [
    {
      id: "received",
      label: "Recibidos",
      value: counts.received,
      detail: fresh > 0 ? plural(fresh, "nuevo") : "sin nuevos",
      tone: "brand",
    },
    {
      id: "preparing",
      label: "En preparación",
      value: counts.preparing,
      detail: late > 0 ? plural(late, "demorado") : "a tiempo",
      tone: "warning",
    },
    {
      id: "delivered",
      label: "Entregados",
      value: counts.delivered,
      detail: `últimos ${DELIVERED_BOARD_WINDOW_MINUTES} min`,
      tone: "success",
    },
  ];
}

/** Toolbar chips: "Todos" and "Demorados". */
export type QuickFilter = "all" | "delayed";

export function countQuickFilters(orders: readonly Order[], now: string): Record<QuickFilter, number> {
  const onBoard = orders.filter((order) => order.status !== "cancelled");
  return { all: onBoard.length, delayed: onBoard.filter((order) => isOrderDelayed(order, now)).length };
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

/** "Pedido, mesa o cliente…": order number (with or without #), "Mesa N", space or customer. */
function matchesSearch(order: Order, query: string): boolean {
  if (query === "") return true;
  const tableQuery = /^mesa\s*(\d+)$/.exec(query);
  if (tableQuery) return Number(tableQuery[1]) === order.tableNumber;
  const digits = query.replace(/^#/, "");
  if (/^\d+$/.test(digits)) return String(order.number).includes(digits) || Number(digits) === order.tableNumber;
  return normalize(order.customer).includes(query) || normalize(order.spaceName ?? "").includes(query);
}

export type BoardFilters = {
  query: string;
  quickFilter: QuickFilter;
  /** "Entregados visibles" toggle. */
  showDelivered: boolean;
  now: string;
};

/** Orders the board shows: search, quick filter and delivered visibility; cancelled orders never. */
export function filterBoardOrders(
  orders: readonly Order[],
  { query, quickFilter, showDelivered, now }: BoardFilters,
): Order[] {
  const normalized = normalize(query);
  return orders.filter(
    (order) =>
      order.status !== "cancelled" &&
      (showDelivered || order.status !== "delivered") &&
      (quickFilter === "all" || isOrderDelayed(order, now)) &&
      matchesSearch(order, normalized),
  );
}

/**
 * Orders that belong on the board at `now`: delivered ones only during the last
 * `DELIVERED_BOARD_WINDOW_MINUTES` after their delivery. Returns a new array.
 */
export function keepRecentDelivered(orders: readonly Order[], now: string): Order[] {
  return orders.filter((order) => {
    if (order.status !== "delivered") return true;
    const deliveredAt = order.history.findLast((event) => event.kind === "delivered")?.at ?? order.receivedAt;
    return minutesBetween(deliveredAt, now) <= DELIVERED_BOARD_WINDOW_MINUTES;
  });
}

/** Column order of the optimized export: the latest order on top. Returns a new array. */
export function sortNewestFirst(orders: readonly Order[]): Order[] {
  return [...orders].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt) || b.number - a.number);
}

/** "Mesa 03 - Salón · Martina"; tables without a space drop the space, orders without a customer the name. */
export function formatOrderLocation(order: Order): string {
  const table = formatTableLabel(order.tableNumber);
  const location = order.spaceName ? `${table} - ${order.spaceName}` : table;
  return order.customer ? `${location} · ${order.customer}` : location;
}

/** Note under a product line: the chosen options and the customer's note for that line. */
export function getItemNote(item: OrderItem): string | null {
  const parts = [item.customization, item.note].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : null;
}

const PANEL_ACTIONS: Partial<Record<Order["status"], { label: string; tone: OrderTone }>> = {
  received: { label: "Comenzar preparación", tone: "brand" },
  preparing: { label: "Marcar como entregado", tone: "warning" },
};

/** Primary button of the detail panel; finished orders have none. */
export function getPanelAction(order: Order): { label: string; tone: OrderTone } | null {
  return PANEL_ACTIONS[order.status] ?? null;
}

/** Order the persistent panel opens with: the oldest delayed one, else the oldest received, else the first. */
export function getDefaultSelectedOrderId(orders: readonly Order[], now: string): string | null {
  const onBoard = orders.filter((order) => order.status !== "cancelled");
  const pick =
    onBoard.find((order) => isOrderDelayed(order, now)) ??
    onBoard.find((order) => order.status === "received") ??
    onBoard[0];
  return pick?.id ?? null;
}

export type TimelineEntry = {
  id: string;
  /** "HH:MM", or "Ahora" for the live delay entry. */
  time: string;
  label: string;
  tone: OrderTone;
};

const firstName = (name: string) => name.split(" ")[0];

function describeEvent(event: OrderHistoryEvent): { label: string; tone: OrderTone } {
  switch (event.kind) {
    case "confirmed":
      return { label: "Pedido recibido", tone: "brand" };
    case "received":
      return { label: event.by ? `Confirmado por ${firstName(event.by)}` : "Confirmado en cocina", tone: "brand" };
    case "preparing":
      return { label: "Preparación iniciada", tone: "warning" };
    case "delivered":
      return { label: "Pedido entregado", tone: "success" };
    case "cancelled":
      return { label: "Pedido cancelado", tone: "danger" };
  }
}

/** "Cronología": the status history, closed by "Ahora · Demorado +N min" while delayed. */
export function getOrderTimeline(order: Order, now: string): TimelineEntry[] {
  const entries: TimelineEntry[] = order.history.map((event, index) => ({
    id: `${event.kind}-${index}`,
    time: event.at,
    ...describeEvent(event),
  }));
  const delay = getOrderDelayMinutes(order, now);
  if (delay > 0) entries.push({ id: "delay", time: "Ahora", label: `Demorado +${delay} min`, tone: "danger" });
  return entries;
}
