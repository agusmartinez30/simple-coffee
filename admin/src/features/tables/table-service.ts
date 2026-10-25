import {
  getActiveBillRequest,
  getOpenSession,
  type ServiceCollection,
  type ServiceDay,
  type ServiceOrder,
  type TableSession,
} from "@/mocks/service-day";
import type { BillPaymentMethod, CollectionMethod } from "@/mocks/types";

/**
 * In-memory operations of 02 on the service day: loading an order to a table ("Asignar pedido")
 * and charging it ("Cobrar mesa"). They return a new day and never mutate the given one, so every
 * derived screen value (tiles, totals, summary) follows.
 */

const pad = (value: number) => String(value).padStart(2, "0");

export type DraftLine = { productId: string; quantity: number };

export type AssignOrderInput = {
  tableNumber: number;
  lines: readonly DraftLine[];
  /** Kitchen note; blank notes are left out. */
  note: string;
  /** Who the order is for; staff-loaded orders carry the staff member's name. */
  customer: string;
  /** Local "HH:MM" from the mock clock. */
  at: string;
};

function openSession(day: ServiceDay, tableNumber: number, at: string): TableSession {
  const index = day.sessions.filter((session) => session.tableNumber === tableNumber && session.date === day.date).length + 1;
  return { id: `S-${day.date}-${pad(tableNumber)}-${index}`, tableNumber, date: day.date, openedAt: at, closedAt: undefined };
}

/**
 * Adds a received order to the table's open session, opening one at `at` when the table is free.
 * Unknown products, empty orders and tables that are not live leave the day unchanged.
 */
export function assignOrder(day: ServiceDay, { tableNumber, lines, note, customer, at }: AssignOrderInput): ServiceDay {
  if (lines.length === 0 || !day.tableNumbers.includes(tableNumber)) return day;
  const products = lines.map((line) => day.products.find((product) => product.id === line.productId));
  if (products.some((product) => !product)) return day;

  const existing = getOpenSession(day, tableNumber);
  const session = existing ?? openSession(day, tableNumber, at);
  const id = Math.max(0, ...day.orders.map((order) => order.id)) + 1;
  const trimmed = note.trim();
  const order: ServiceOrder = {
    id,
    sessionId: session.id,
    tableNumber,
    customer,
    receivedAt: at,
    items: lines.map((line, index) => {
      const product = products[index]!;
      return {
        id: `${id}-${index + 1}`,
        productId: product.id,
        quantity: line.quantity,
        name: line.quantity > 1 && product.plural ? product.plural : product.name,
        unitPrice: product.price,
      };
    }),
    ...(trimmed && { note: trimmed }),
    status: "received",
    history: [
      { kind: "confirmed", at },
      { kind: "received", at },
    ],
  };
  return {
    ...day,
    sessions: existing ? day.sessions : [...day.sessions, session],
    orders: [...day.orders, order],
  };
}

export type CloseTableInput = {
  tableNumber: number;
  at: string;
  confirmedBy: string;
  /** "Medio de pago" staff chose; it may differ from the customer's preference. */
  method: CollectionMethod;
  /** Tip in ARS; zero or negative records no tip. */
  tip: number;
};

/**
 * "Cobrar mesa": closes the open session at `at`, finalizes its bill request and records the
 * collection with the chosen method and tip (its amount is derived from the session's orders; the
 * tip stays apart). A table that did not ask for the bill keeps a register preference. Free tables
 * leave the day unchanged.
 */
export function closeTable(day: ServiceDay, { tableNumber, at, confirmedBy, method, tip }: CloseTableInput): ServiceDay {
  const session = getOpenSession(day, tableNumber);
  if (!session) return day;
  const request = getActiveBillRequest(day, session.id);
  const preference: BillPaymentMethod = request?.paymentPreference ?? "register";
  const collection: ServiceCollection = {
    number: Math.max(0, ...day.collections.map((item) => item.number)) + 1,
    sessionId: session.id,
    time: at,
    method,
    customerPreference: preference,
    confirmedBy,
    adjustments: 0,
    ...(tip > 0 && { tip: Math.round(tip) }),
  };
  return {
    ...day,
    sessions: day.sessions.map((item) => (item.id === session.id ? { ...item, closedAt: at } : item)),
    billRequests: day.billRequests.map((item) =>
      item.id === request?.id ? { ...item, status: "finalized", assignee: confirmedBy } : item,
    ),
    collections: [...day.collections, collection],
  };
}
