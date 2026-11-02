import { describe, expect, it } from "vitest";
import { MOCK_BOARD, byNumber } from "./order-fixtures";
import type { Order } from "./order-types";
import { countOrdersByColumn } from "./orders-view";
import {
  createOrdersState,
  getCancelTarget,
  getSelectedOrder,
  isOrderPending,
  ordersReducer,
  type OrdersState,
} from "./orders-state";

const initial = createOrdersState(MOCK_BOARD);
const o1051 = byNumber(MOCK_BOARD, 1051);
const o1052 = byNumber(MOCK_BOARD, 1052);

/** The copy of an order the API answers after a change. */
const changed = (order: Order, overrides: Partial<Order>): Order => ({
  ...order,
  updatedAt: "2026-11-02T16:00:00.000Z",
  ...overrides,
});

describe("createOrdersState", () => {
  it("starts loading with nothing open, or ready with given orders", () => {
    const loading = createOrdersState();
    expect(loading.load).toBe("loading");
    expect(loading.orders).toEqual([]);
    expect(initial.load).toBe("ready");
    expect(initial.selectedId).toBeNull();
    expect(initial.cancelTargetId).toBeNull();
    expect(initial.pendingIds).toEqual([]);
    expect(initial.notice).toBeNull();
  });
});

describe("loading from the API", () => {
  it("opens the panel on the default order of the first load only", () => {
    const first = ordersReducer(createOrdersState(), { type: "loaded", orders: MOCK_BOARD, defaultSelectedId: o1051.id });
    expect(first.load).toBe("ready");
    expect(getSelectedOrder(first)?.number).toBe(1051);

    const closed = ordersReducer(first, { type: "close-detail" });
    const polled = ordersReducer(closed, { type: "loaded", orders: MOCK_BOARD, defaultSelectedId: o1052.id });
    expect(polled.selectedId).toBeNull();
  });

  it("takes the server list but keeps a newer local copy of an order", () => {
    const advanced = changed(o1051, { status: "preparing" });
    const local = ordersReducer(initial, { type: "action-succeeded", order: advanced });
    // A poll that started before the advance still carries the old copy.
    const polled = ordersReducer(local, { type: "loaded", orders: MOCK_BOARD, defaultSelectedId: null });
    expect(byNumber(polled.orders, 1051).status).toBe("preparing");

    const newer = changed(o1051, { status: "delivered", updatedAt: "2026-11-02T16:05:00.000Z" });
    const later = ordersReducer(polled, { type: "loaded", orders: [newer], defaultSelectedId: null });
    expect(later.orders.map((order) => [order.number, order.status])).toEqual([[1051, "delivered"]]);
  });

  it("closes the panel and the dialog of an order cancelled elsewhere", () => {
    const open = ordersReducer(ordersReducer(initial, { type: "open-detail", id: o1051.id }), {
      type: "request-cancel",
      id: o1051.id,
    });
    const cancelled = changed(o1051, { status: "cancelled", cancellationReason: "order-error" });
    const polled = ordersReducer(open, { type: "loaded", orders: [cancelled], defaultSelectedId: null });
    expect(polled.selectedId).toBeNull();
    expect(polled.cancelTargetId).toBeNull();
  });

  it("fails the first load, but only warns once the board is up", () => {
    const failed = ordersReducer(createOrdersState(), { type: "load-failed", message: "Sin conexión" });
    expect(failed.load).toBe("failed");
    expect(failed.notice).toBeNull();

    const warned = ordersReducer(initial, { type: "load-failed", message: "Sin conexión" });
    expect(warned.load).toBe("ready");
    expect(warned.orders).toBe(initial.orders);
    expect(warned.notice).toBe("Sin conexión");
    expect(ordersReducer(warned, { type: "dismiss-notice" }).notice).toBeNull();
  });
});

describe("advance and cancel", () => {
  it("marks the order pending until the API answers, then applies its copy", () => {
    const open = ordersReducer(initial, { type: "open-detail", id: o1051.id });
    const started = ordersReducer(open, { type: "action-started", id: o1051.id });
    expect(isOrderPending(started, o1051.id)).toBe(true);
    expect(getSelectedOrder(started)?.status).toBe("received");

    const done = ordersReducer(started, { type: "action-succeeded", order: changed(o1051, { status: "preparing" }) });
    expect(isOrderPending(done, o1051.id)).toBe(false);
    expect(getSelectedOrder(done)?.status).toBe("preparing");
    expect(countOrdersByColumn(done.orders)).toEqual({ received: 1, preparing: 3, delivered: 1 });
  });

  it("keeps the order as it was and shows the error when the API refuses", () => {
    const started = ordersReducer(initial, { type: "action-started", id: o1051.id });
    const failed = ordersReducer(started, { type: "action-failed", id: o1051.id, message: "No pudimos" });
    expect(isOrderPending(failed, o1051.id)).toBe(false);
    expect(failed.orders).toBe(initial.orders);
    expect(failed.notice).toBe("No pudimos");
    expect(ordersReducer(started, { type: "action-failed", id: o1051.id, message: null }).notice).toBeNull();
  });

  it("only asks to cancel orders that can still be cancelled", () => {
    const asked = ordersReducer(initial, { type: "request-cancel", id: o1051.id });
    expect(getCancelTarget(asked)?.number).toBe(1051);
    expect(ordersReducer(initial, { type: "request-cancel", id: byNumber(MOCK_BOARD, 1047).id })).toBe(initial);
  });

  it("keeps the order untouched when the dialog is dismissed", () => {
    const asked = ordersReducer(initial, { type: "request-cancel", id: o1051.id });
    const back = ordersReducer(asked, { type: "dismiss-cancel" });
    expect(back.cancelTargetId).toBeNull();
    expect(back.orders).toBe(initial.orders);
  });

  it("closes the dialog and its panel once the cancellation is applied", () => {
    const open = ordersReducer(initial, { type: "open-detail", id: o1051.id });
    const asked = ordersReducer(open, { type: "request-cancel", id: o1051.id });
    const started = ordersReducer(asked, { type: "action-started", id: o1051.id });
    expect(started.cancelTargetId).toBe(o1051.id);

    const done = ordersReducer(started, {
      type: "action-succeeded",
      order: changed(o1051, { status: "cancelled", cancellationReason: "customer-request" }),
    });
    expect(byNumber(done.orders, 1051).cancellationReason).toBe("customer-request");
    expect(done.cancelTargetId).toBeNull();
    expect(done.selectedId).toBeNull();
    expect(countOrdersByColumn(done.orders)).toEqual({ received: 1, preparing: 2, delivered: 1 });
  });

  it("keeps another selected order when cancelling a different one", () => {
    const open = ordersReducer(initial, { type: "open-detail", id: o1052.id });
    const asked: OrdersState = ordersReducer(open, { type: "request-cancel", id: o1051.id });
    const done = ordersReducer(asked, { type: "action-succeeded", order: changed(o1051, { status: "cancelled" }) });
    expect(done.selectedId).toBe(o1052.id);
  });

  it("closes the dialog when the cancellation fails", () => {
    const asked = ordersReducer(initial, { type: "request-cancel", id: o1051.id });
    const failed = ordersReducer(asked, { type: "action-failed", id: o1051.id, message: "No pudimos" });
    expect(failed.cancelTargetId).toBeNull();
  });

  it("selects and clears the detail panel, ignoring unknown orders", () => {
    const open = ordersReducer(initial, { type: "open-detail", id: o1052.id });
    expect(getSelectedOrder(open)?.number).toBe(1052);
    expect(ordersReducer(open, { type: "close-detail" }).selectedId).toBeNull();
    expect(ordersReducer(initial, { type: "open-detail", id: "missing" })).toBe(initial);
  });
});

describe("creating an order", () => {
  it("adds the order the API created and opens it in the panel", () => {
    const created: Order = { ...o1051, id: "new-order", number: 1099, updatedAt: "2026-11-02T18:00:00.000Z" };
    const next = ordersReducer(initial, { type: "created", order: created });
    expect(next.orders).toHaveLength(MOCK_BOARD.length + 1);
    expect(getSelectedOrder(next)?.number).toBe(1099);
  });

  it("keeps a single copy when a poll already brought it", () => {
    const polled = ordersReducer(initial, { type: "loaded", orders: [...MOCK_BOARD, { ...o1052, id: "new-order" }], defaultSelectedId: null });
    const next = ordersReducer(polled, { type: "created", order: { ...o1052, id: "new-order" } });
    expect(next.orders.filter((order) => order.id === "new-order")).toHaveLength(1);
    expect(next.selectedId).toBe("new-order");
  });
});
