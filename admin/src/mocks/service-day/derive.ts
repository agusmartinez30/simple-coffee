import type {
  AttentionOrder,
  BestSeller,
  BillRequest,
  BillRequestsBoard,
  CollectionOrder,
  CollectionsHistory,
  ManagedBillRequest,
  ManagedCollection,
  ManagedOrder,
  ManagedTable,
  OrdersBoard,
  OverviewSnapshot,
  TableSnapshot,
  TablesBoard,
} from "../types";
import { addMinutes, minutesBetween } from "./time";
import type { ServiceBillRequest, ServiceCollection, ServiceDay, ServiceOrder, TableSession } from "./types";

/** Pure derivations: every screen's rows and metrics come out of one `ServiceDay`. */

/** Delivered orders stay on the 03 kitchen board this long, then leave it. */
export const DELIVERED_BOARD_WINDOW_MINUTES = 30;

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

export function getOrderTotal(order: Pick<ServiceOrder, "items">): number {
  return order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function isUnfinished(order: ServiceOrder): boolean {
  return order.status === "received" || order.status === "preparing";
}

/** Confirmed (not cancelled) orders of a table session, in confirmation order. */
export function getSessionOrders(day: ServiceDay, sessionId: string): ServiceOrder[] {
  return day.orders
    .filter((order) => order.sessionId === sessionId && order.status !== "cancelled")
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
}

export function getOpenSession(day: ServiceDay, tableNumber: number): TableSession | undefined {
  return day.sessions.find((session) => session.tableNumber === tableNumber && !session.closedAt);
}

function getSession(day: ServiceDay, sessionId: string): TableSession {
  const session = day.sessions.find((candidate) => candidate.id === sessionId);
  if (!session) throw new Error(`Unknown session ${sessionId}`);
  return session;
}

/** Pending or in-attention request of a session. */
export function getActiveBillRequest(day: ServiceDay, sessionId: string): ServiceBillRequest | undefined {
  return day.billRequests.find((request) => request.sessionId === sessionId && request.status !== "finalized");
}

function getCollection(day: ServiceDay, sessionId: string): ServiceCollection | undefined {
  return day.collections.find((collection) => collection.sessionId === sessionId);
}

function getTodaysOrders(day: ServiceDay): ServiceOrder[] {
  const today = new Set(day.sessions.filter((session) => session.date === day.date).map((session) => session.id));
  return day.orders.filter((order) => today.has(order.sessionId) && order.status !== "cancelled");
}

/** Strips the catalogue reference so screens receive their own order shape. */
function toManagedOrder(order: ServiceOrder, spaceName?: string): ManagedOrder {
  return {
    id: order.id,
    tableNumber: order.tableNumber,
    ...(spaceName && { spaceName }),
    customer: order.customer,
    receivedAt: order.receivedAt,
    items: order.items.map(({ id, quantity, name, variant, unitPrice, customization }) => ({
      id,
      quantity,
      name,
      unitPrice,
      ...(variant && { variant }),
      ...(customization && { customization }),
    })),
    ...(order.note && { note: order.note }),
    status: order.status,
    history: order.history,
    ...(order.cancellationReason && { cancellationReason: order.cancellationReason }),
  };
}

// 02 · Gestión de mesas

/** A table as 02 shows it: status, counts and account from its open session. */
export function deriveTable(day: ServiceDay, tableNumber: number): ManagedTable {
  const id = `table-${pad(tableNumber)}`;
  const session = getOpenSession(day, tableNumber);
  if (!session) {
    return { id, number: tableNumber, status: "available", confirmedOrders: 0, pendingKitchenOrders: 0, accountTotal: 0 };
  }
  const orders = getSessionOrders(day, session.id);
  const request = getActiveBillRequest(day, session.id);
  return {
    id,
    number: tableNumber,
    status: request ? "bill-requested" : "occupied",
    confirmedOrders: orders.length,
    pendingKitchenOrders: orders.filter(isUnfinished).length,
    accountTotal: orders.reduce((sum, order) => sum + getOrderTotal(order), 0),
    ...(request && {
      paymentPreference: request.paymentPreference,
      billRequestedMinutesAgo: minutesBetween(request.requestedAt, day.now),
    }),
    seatedMinutes: minutesBetween(session.openedAt, day.now),
  };
}

export function getTablesBoard(day: ServiceDay): TablesBoard {
  return {
    syncedAt: day.syncedAt,
    tables: day.tableNumbers.map((number) => deriveTable(day, number)),
  };
}

// 03 · Gestión de pedidos

/** Kitchen board: orders of seated tables, oldest first; delivered ones leave after the window. */
export function getOrdersBoard(day: ServiceDay): OrdersBoard {
  const open = new Set(day.sessions.filter((session) => !session.closedAt).map((session) => session.id));
  const orders = day.orders
    .filter((order) => open.has(order.sessionId))
    .filter((order) => {
      if (order.status !== "delivered") return true;
      const deliveredAt = order.history.find((event) => event.kind === "delivered")?.at ?? order.receivedAt;
      return minutesBetween(deliveredAt, day.now) <= DELIVERED_BOARD_WINDOW_MINUTES;
    })
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const spaceOf = (tableNumber: number) => {
    const spaceId = day.tables.find((table) => table.number === tableNumber)?.spaceId;
    return day.spaces.find((space) => space.id === spaceId)?.name;
  };
  return { orders: orders.map((order) => toManagedOrder(order, spaceOf(order.tableNumber))) };
}

// 04 · Solicitudes de cuenta

function deriveBillRequest(day: ServiceDay, request: ServiceBillRequest): ManagedBillRequest {
  const session = getSession(day, request.sessionId);
  const orders = getSessionOrders(day, session.id);
  const table = day.tables.find((candidate) => candidate.number === session.tableNumber);
  const spaceName = day.spaces.find((space) => space.id === table?.spaceId)?.name ?? "Sin espacio";
  const consumptionMap = orders
    .flatMap((order) => order.items)
    .reduce<Map<string, ManagedBillRequest["consumptions"][number]>>((items, item) => {
      const current = items.get(item.productId);
      const quantity = (current?.quantity ?? 0) + item.quantity;
      items.set(item.productId, {
        id: item.productId,
        name: item.name,
        quantity,
        unitPrice: item.unitPrice,
        total: quantity * item.unitPrice,
      });
      return items;
    }, new Map());
  const consumptions = Array.from(consumptionMap.values());
  const receipt = request.history.find((event) => event.kind === "receipt-reported");
  const verification = request.history.find((event) => event.kind === "payment-verified");
  const paymentVerification: ManagedBillRequest["paymentVerification"] =
    request.paymentPreference !== "transfer"
      ? { status: "not-required" }
      : verification
        ? {
            status: "verified",
            ...(receipt && { reportedAt: receipt.at }),
            verifiedAt: verification.at,
            verifiedBy: verification.by ?? request.assignee ?? "Sin asignar",
          }
        : receipt
          ? { status: "pending", reportedAt: receipt.at }
          : { status: "awaiting-receipt" };
  const until = request.status === "finalized" ? (getCollection(day, session.id)?.time ?? day.now) : day.now;
  return {
    id: request.id,
    tableNumber: session.tableNumber,
    spaceName,
    customer: request.customer,
    requestedAt: request.requestedAt,
    waitMinutes: minutesBetween(request.requestedAt, until),
    paymentPreference: request.paymentPreference,
    total: consumptions.reduce((sum, item) => sum + item.total, 0),
    consumptions,
    confirmedOrders: orders.length,
    ordersInPreparation: orders.filter(isUnfinished).length,
    status: request.status,
    ...(request.assignee && { assignee: request.assignee }),
    paymentVerification,
    history: request.history.map((event) => ({ ...event })),
  };
}

/** Today's requests, active first and then by longest wait ("Mayor espera"). */
export function getBillRequestsBoard(day: ServiceDay, selectedId = "SC-010"): BillRequestsBoard {
  const requests = day.billRequests
    .filter((request) => getSession(day, request.sessionId).date === day.date)
    .map((request) => deriveBillRequest(day, request))
    .sort(
      (a, b) =>
        Number(b.status !== "finalized") - Number(a.status !== "finalized") || b.waitMinutes - a.waitMinutes,
    );
  return { requests, selectedId };
}

// 05 · Historial de cobros

function deriveCollection(day: ServiceDay, collection: ServiceCollection): ManagedCollection {
  const session = getSession(day, collection.sessionId);
  const orders: CollectionOrder[] = getSessionOrders(day, session.id).map((order) => ({
    id: order.id,
    customer: order.customer,
    items: order.items.map(({ quantity, name }) => ({ quantity, name })),
    total: getOrderTotal(order),
  }));
  const subtotal = orders.reduce((sum, order) => sum + order.total, 0);
  return {
    id: `COB-${pad(collection.number, 4)}`,
    accountId: `CTA-${pad(collection.number, 3)}`,
    tableNumber: session.tableNumber,
    date: session.date,
    time: collection.time,
    method: collection.method,
    customerPreference: collection.customerPreference,
    amount: subtotal + collection.adjustments,
    adjustments: collection.adjustments,
    confirmedBy: collection.confirmedBy,
    status: "confirmed",
    orders,
    audit: [
      { kind: "payment-confirmed", at: collection.time },
      { kind: "balance-updated", at: collection.time },
      { kind: "table-session-closed", at: session.closedAt ?? addMinutes(collection.time, 1) },
    ],
  };
}

/** Every collection, newest first. */
export function getCollectionsHistory(day: ServiceDay, selectedId = "COB-0026"): CollectionsHistory {
  const collections = day.collections
    .map((collection) => deriveCollection(day, collection))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  return { today: day.date, collections, selectedId };
}

// 10A · Resumen general

function toAttentionOrder(day: ServiceDay, order: ServiceOrder): AttentionOrder {
  return {
    id: order.id,
    table: pad(order.tableNumber),
    customer: order.customer,
    items: order.items.map(({ quantity, name }) => ({ quantity, name })),
    note: order.items.find((line) => line.customization)?.customization,
    status: order.status === "preparing" ? "preparing" : order.status === "delivered" ? "delivered" : "received",
    waitMinutes: minutesBetween(order.receivedAt, day.now),
  };
}

/** Top five products sold today, by quantity. */
export function getBestSellers(day: ServiceDay, limit = 5): BestSeller[] {
  const sold = new Map<string, number>();
  for (const line of getTodaysOrders(day).flatMap((order) => order.items)) {
    sold.set(line.productId, (sold.get(line.productId) ?? 0) + line.quantity);
  }
  return day.products
    .map((product) => ({ name: product.name, quantity: sold.get(product.id) ?? 0 }))
    .filter((product) => product.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export function getOverviewSnapshot(day: ServiceDay): OverviewSnapshot {
  const tables: TableSnapshot[] = day.tableNumbers.map((number) => {
    const table = deriveTable(day, number);
    return {
      number,
      status: table.status === "available" ? "free" : table.status,
      preparing: table.pendingKitchenOrders > 0,
    };
  });
  const board = getBillRequestsBoard(day).requests;
  const billRequests: BillRequest[] = board
    .filter((request) => request.status === "pending")
    .map((request) => ({
      table: pad(request.tableNumber),
      paymentMethod: request.paymentPreference,
      total: request.total,
      waitMinutes: request.waitMinutes,
      ordersInPreparation: request.ordersInPreparation,
    }));
  const payments = getCollectionsHistory(day)
    .collections.filter((collection) => collection.date === day.date)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((collection) => ({ id: collection.id, amount: collection.amount, closedAt: collection.time }));
  const open = new Set(day.sessions.filter((session) => !session.closedAt).map((session) => session.id));
  return {
    lastSync: day.syncedAt,
    orders: day.orders
      .filter((order) => open.has(order.sessionId) && order.status === "received")
      .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
      .map((order) => toAttentionOrder(day, order)),
    billRequests,
    tables,
    payments,
    confirmedOrders: getTodaysOrders(day).length,
    bestSellers: getBestSellers(day),
  };
}
