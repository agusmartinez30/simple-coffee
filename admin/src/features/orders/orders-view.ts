import type { CancellationReason, Order, OrderStatus } from "./order-types";

export type OrderTone = "brand" | "warning" | "success" | "danger";

/** Kitchen stages that own a board column and a metric; cancelled orders leave the board. */
export type OrderColumnId = Exclude<OrderStatus, "cancelled">;

const COLUMN_ORDER: readonly OrderColumnId[] = ["received", "preparing", "delivered"];

const COLUMN_COPY: Record<OrderColumnId, { title: string; tone: OrderTone }> = {
  received: { title: "Recibidos", tone: "brand" },
  preparing: { title: "En preparación", tone: "warning" },
  delivered: { title: "Entregados", tone: "success" },
};

function isOnBoard(order: Order): order is Order & { status: OrderColumnId } {
  return order.status !== "cancelled";
}

export function countOrdersByColumn(orders: readonly Order[]): Record<OrderColumnId, number> {
  const counts: Record<OrderColumnId, number> = { received: 0, preparing: 0, delivered: 0 };
  for (const order of orders) if (isOnBoard(order)) counts[order.status] += 1;
  return counts;
}

export type OrderColumn = {
  id: OrderColumnId;
  title: string;
  tone: OrderTone;
  orders: Order[];
};

/** "Tablero de estados" columns; "Entregados visibles" off hides the delivered column. */
export function groupOrdersByColumn(
  orders: readonly Order[],
  { showDelivered = true }: { showDelivered?: boolean } = {},
): OrderColumn[] {
  return COLUMN_ORDER.filter((id) => showDelivered || id !== "delivered").map((id) => ({
    id,
    ...COLUMN_COPY[id],
    orders: orders.filter((order) => order.status === id),
  }));
}

/** "Mesa 03". */
export function formatTableLabel(tableNumber: number): string {
  return `Mesa ${String(tableNumber).padStart(2, "0")}`;
}

export function getOrderTotal(order: Pick<Order, "items">): number {
  return order.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
}

const STATUS_BADGES: Record<OrderStatus, { label: string; tone: OrderTone }> = {
  received: { label: "Recibido", tone: "brand" },
  preparing: { label: "En preparación", tone: "warning" },
  delivered: { label: "Entregado", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

/** Status badge of the detail panel. */
export function getStatusBadge(status: OrderStatus): { label: string; tone: OrderTone } {
  return STATUS_BADGES[status];
}

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  received: "preparing",
  preparing: "delivered",
  delivered: null,
  cancelled: null,
};

/** The only forward transition allowed from `status`, or null once the order is finished. */
export function getNextStatus(status: OrderStatus): OrderStatus | null {
  return NEXT_STATUS[status];
}

const PRIMARY_ACTIONS: Partial<Record<OrderStatus, { label: string; tone: OrderTone }>> = {
  received: { label: "Comenzar preparación", tone: "brand" },
  preparing: { label: "Marcar entregado", tone: "warning" },
};

/** Primary action of a card; finished orders have none. */
export function getPrimaryAction(order: Order): { label: string; tone: OrderTone } | null {
  return PRIMARY_ACTIONS[order.status] ?? null;
}

/** Delivered orders already reached the table, so only received or preparing ones can be cancelled. */
export function canCancelOrder(order: Order): boolean {
  return order.status === "received" || order.status === "preparing";
}

/** Options of the cancellation "Reason Selector", in the order of the dialog. */
export const CANCELLATION_REASONS: readonly { id: CancellationReason; label: string }[] = [
  { id: "product-unavailable", label: "Producto no disponible" },
  { id: "customer-request", label: "Solicitado por el cliente" },
  { id: "order-error", label: "Error en el pedido" },
];
