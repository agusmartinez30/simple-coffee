/**
 * Board model of 03 · Gestión de pedidos. `orders-mapper.ts` builds it from the `/orders` API;
 * times are local "HH:MM" in the service time zone, so the view helpers stay pure and deterministic.
 */

/** Kitchen stage of an order; cancelled orders leave the board. */
export type OrderStatus = "received" | "preparing" | "delivered" | "cancelled";

/** Entries of the panel's "Cronología"; `confirmed` is a table order arriving without a staff member. */
export type OrderHistoryKind = "confirmed" | OrderStatus;

export type OrderHistoryEvent = {
  kind: OrderHistoryKind;
  /** Local "HH:MM" time. */
  at: string;
  /** Staff member who made the change. */
  by?: string;
};

export type CancellationReason = "product-unavailable" | "customer-request" | "order-error";

export type OrderItem = {
  id: string;
  quantity: number;
  name: string;
  /** Size or temperature line under the product name, e.g. "Grande · caliente". */
  variant?: string;
  /** Unit price in ARS. */
  unitPrice: number;
  /** Chosen options, e.g. "Leche deslactosada". */
  customization?: string;
  /** Free-text note the customer left on this line. */
  note?: string;
};

export type Order = {
  /** API id, used for every call. */
  id: string;
  /** Visible number shown as "Pedido #1051". */
  number: number;
  tableNumber: number;
  /** Space of the table, e.g. "Salón". */
  spaceName?: string;
  /** Customer name; empty when the order only names its table. */
  customer: string;
  /** Local "HH:MM" time the order was received. */
  receivedAt: string;
  items: OrderItem[];
  /** Free-text "Nota del cliente" for the whole order. */
  note?: string;
  status: OrderStatus;
  history: OrderHistoryEvent[];
  cancellationReason?: CancellationReason;
  /** ISO instant of the last change; the newer copy wins when a poll and an action cross. */
  updatedAt: string;
};
