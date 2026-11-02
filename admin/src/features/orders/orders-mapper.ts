import type { CancellationReason, Order, OrderHistoryEvent, OrderItem, OrderStatus } from "./order-types";
import { formatServiceTime } from "./service-clock";

/**
 * `/orders` API body → board model. The API answers lowercase statuses, snake_case cancellation
 * reasons and ISO instants; the board works with kebab-case reasons and local "HH:MM" times.
 */

const STATUSES: readonly OrderStatus[] = ["received", "preparing", "delivered", "cancelled"];

const REASONS_FROM_API: Record<string, CancellationReason> = {
  product_unavailable: "product-unavailable",
  customer_request: "customer-request",
  order_error: "order-error",
};

export type ApiCancellationReason = "product_unavailable" | "customer_request" | "order_error";

const REASONS_TO_API: Record<CancellationReason, ApiCancellationReason> = {
  "product-unavailable": "product_unavailable",
  "customer-request": "customer_request",
  "order-error": "order_error",
};

export function toApiCancellationReason(reason: CancellationReason): ApiCancellationReason {
  return REASONS_TO_API[reason];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isStatus = (value: unknown): value is OrderStatus => STATUSES.includes(value as OrderStatus);

/** Non-empty text, or undefined for null/blank. */
const optionalText = (value: unknown): string | undefined =>
  isString(value) && value.trim() !== "" ? value : undefined;

function toTime(value: unknown): string | null {
  if (!isString(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatServiceTime(date);
}

function toItem(value: unknown): OrderItem | null {
  if (!isRecord(value)) return null;
  const { id, productName, quantity, unitPrice, note, options } = value;
  if (!isString(id) || !isString(productName) || !isNumber(quantity) || !isNumber(unitPrice) || !Array.isArray(options)) {
    return null;
  }
  const optionNames = options.map((option) => (isRecord(option) && isString(option.optionName) ? option.optionName : null));
  if (optionNames.some((name) => name === null)) return null;
  const item: OrderItem = { id, quantity, name: productName, unitPrice };
  if (optionNames.length > 0) item.customization = optionNames.join(" · ");
  const lineNote = optionalText(note);
  if (lineNote) item.note = lineNote;
  return item;
}

function toEvent(value: unknown): OrderHistoryEvent | null {
  if (!isRecord(value) || !isStatus(value.kind)) return null;
  const at = toTime(value.at);
  if (at === null) return null;
  const by = isRecord(value.actor) && isString(value.actor.name) ? value.actor.name : undefined;
  // A table order arrives with no staff member: the board shows it as "Pedido recibido".
  if (by === undefined) return { kind: value.kind === "received" ? "confirmed" : value.kind, at };
  return { kind: value.kind, at, by };
}

function mapAll<T>(values: unknown, map: (value: unknown) => T | null): T[] | null {
  if (!Array.isArray(values)) return null;
  const mapped = values.map(map);
  return mapped.every((entry) => entry !== null) ? (mapped as T[]) : null;
}

/** One API order, or null when the body is not one. */
export function toOrder(value: unknown): Order | null {
  if (!isRecord(value)) return null;
  const { id, number, tableNumber, tableLabel, spaceName, customerName, note, status, cancellationReason, updatedAt } =
    value;
  if (!isString(id) || !isNumber(number) || !isNumber(tableNumber) || !isStatus(status) || !isString(updatedAt)) {
    return null;
  }
  if (!isString(customerName) || !isString(tableLabel)) return null;
  const reason = cancellationReason === null ? undefined : REASONS_FROM_API[String(cancellationReason)];
  if (cancellationReason !== null && reason === undefined) return null;
  const receivedAt = toTime(value.createdAt);
  const items = mapAll(value.items, toItem);
  const history = mapAll(value.events, toEvent);
  if (receivedAt === null || items === null || history === null) return null;

  const order: Order = {
    id,
    number,
    tableNumber,
    // The API falls back to the table label when there is no customer name; the card already shows the table.
    customer: customerName === tableLabel ? "" : customerName,
    receivedAt,
    items,
    status,
    history,
    updatedAt,
  };
  const space = optionalText(spaceName);
  if (space) order.spaceName = space;
  const orderNote = optionalText(note);
  if (orderNote) order.note = orderNote;
  if (reason) order.cancellationReason = reason;
  return order;
}

/** A list of API orders, or null when any entry is not one. */
export function toOrders(value: unknown): Order[] | null {
  return mapAll(value, toOrder);
}
