import { InvalidTransitionError } from './orders-errors.js';

/**
 * An order placed for a table and its lifecycle (admin 01 orders board). Lines are priced from the
 * catalog when the order is created and kept as a snapshot, so later catalog changes do not alter
 * it. Money is integer ARS pesos.
 */

export const ORDER_STATUSES = ['received', 'preparing', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CANCELLATION_REASONS = ['product_unavailable', 'customer_request', 'order_error'] as const;
export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

export const ORDER_SOURCES = ['staff', 'table'] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

/** Staff member who created an order or moved it; null when the customer did (table orders). */
export interface OrderActor {
  id: string;
  name: string;
}

export interface OrderItemOption {
  groupTitle: string;
  optionName: string;
  priceDelta: number;
}

export interface OrderItem {
  id: string;
  /** Catalog product id; the product may have been archived since. */
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  /** Product price plus the price deltas of the chosen options. */
  unitPrice: number;
  note: string | null;
  options: OrderItemOption[];
}

export interface OrderEvent {
  kind: OrderStatus;
  at: Date;
  actor: OrderActor | null;
}

export interface Order {
  id: string;
  /** Visible number ("Pedido #1051"), from a sequence. */
  number: number;
  /** Table snapshot at creation time. */
  tableNumber: number;
  tableLabel: string;
  spaceName: string;
  customerName: string;
  note: string | null;
  status: OrderStatus;
  /** Set only when cancelled. */
  cancellationReason: CancellationReason | null;
  source: OrderSource;
  createdBy: OrderActor | null;
  /** Sum of unit price × quantity of every item. */
  total: number;
  items: OrderItem[];
  /** Status history, oldest first; starts with `received`. */
  events: OrderEvent[];
  createdAt: Date;
  updatedAt: Date;
}

/** An order before it is stored: id, number and item ids come from the repository. */
export type NewOrder = Omit<Order, 'id' | 'number' | 'items' | 'updatedAt'> & { items: Omit<OrderItem, 'id'>[] };

const FORWARD: Partial<Record<OrderStatus, OrderStatus>> = { received: 'preparing', preparing: 'delivered' };

/** The status after `status` on the board; null when the order is finished (delivered or cancelled). */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  return FORWARD[status] ?? null;
}

function transition(order: Order, status: OrderStatus, actor: OrderActor, at: Date): Order {
  return { ...order, status, updatedAt: at, events: [...order.events, { kind: status, at, actor }] };
}

/** received → preparing → delivered, one step at a time. */
export function advanceOrder(order: Order, actor: OrderActor, at: Date): Order {
  const next = nextStatus(order.status);
  if (next === null) throw new InvalidTransitionError(order.status, 'advance');
  return transition(order, next, actor, at);
}

/** Only orders not yet delivered can be cancelled, always with a reason. */
export function cancelOrder(order: Order, reason: CancellationReason, actor: OrderActor, at: Date): Order {
  if (order.status !== 'received' && order.status !== 'preparing') throw new InvalidTransitionError(order.status, 'cancel');
  return { ...transition(order, 'cancelled', actor, at), cancellationReason: reason };
}
