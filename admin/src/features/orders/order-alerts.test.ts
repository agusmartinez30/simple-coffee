import { describe, expect, it } from "vitest";
import { SERVICE_DAY, VENUE_SPACES, VENUE_TABLES } from "@/mocks/service-day";
import { MOCK_BOARD, buildOrder, byNumber, numbers } from "./order-fixtures";
import {
  DELAY_TARGET_MINUTES,
  NEW_ORDER_WINDOW_MINUTES,
  countQuickFilters,
  filterBoardOrders,
  formatElapsed,
  formatOrderLocation,
  formatReceivedLine,
  getAlertMetrics,
  getDefaultSelectedOrderId,
  getElapsedBadge,
  getItemNote,
  getOrderDelayMinutes,
  getOrderElapsedMinutes,
  getOrderTimeline,
  getPanelAction,
  isNewOrder,
  isOrderDelayed,
  keepRecentDelivered,
  sortNewestFirst,
} from "./order-alerts";

const NOW = SERVICE_DAY.now;
const board = MOCK_BOARD;
const byId = (number: number) => byNumber(board, number);
const ids = numbers;
const order = buildOrder;

describe("ORDERS_BOARD for the optimized 03", () => {
  it("names the 09A space of each order's table", () => {
    for (const managed of board) {
      const table = VENUE_TABLES.find((candidate) => candidate.number === managed.tableNumber);
      const space = VENUE_SPACES.find((candidate) => candidate.id === table?.spaceId);
      expect(managed.spaceName, `#${managed.number}`).toBe(space?.name);
    }
  });

  it("records the staff member who confirmed each order in the kitchen", () => {
    for (const managed of board) {
      const received = managed.history.find((event) => event.kind === "received");
      expect(received?.by, `#${managed.number}`).toBe("María G.");
    }
  });
});

describe("elapsed time and delays", () => {
  it("measures minutes since the order was received", () => {
    expect(Object.fromEntries(board.map((o) => [o.number, getOrderElapsedMinutes(o, NOW)]))).toEqual({
      1047: 46,
      1048: 38,
      1050: 18,
      1051: 6,
      1052: 4,
    });
    expect(getOrderElapsedMinutes(order({ number: 1, receivedAt: "12:05" }), "12:00")).toBe(0);
  });

  it("flags unfinished orders past the 20-minute target", () => {
    expect(DELAY_TARGET_MINUTES).toBe(20);
    expect(board.filter((o) => isOrderDelayed(o, NOW)).map((o) => o.number)).toEqual([1048]);
    expect(getOrderDelayMinutes(byId(1048), NOW)).toBe(18);
    expect(getOrderDelayMinutes(byId(1050), NOW)).toBe(0);
    expect(isOrderDelayed(order({ number: 1, receivedAt: "12:00" }), "12:20")).toBe(false);
    expect(isOrderDelayed(order({ number: 1, receivedAt: "12:00" }), "12:21")).toBe(true);
  });

  it("never delays delivered or cancelled orders", () => {
    expect(isOrderDelayed(byId(1047), NOW)).toBe(false);
    expect(isOrderDelayed(order({ number: 1, status: "cancelled" }), "13:00")).toBe(false);
  });

  it("marks received orders as new during the first five minutes", () => {
    expect(NEW_ORDER_WINDOW_MINUTES).toBe(5);
    expect(board.filter((o) => isNewOrder(o, NOW)).map((o) => o.number)).toEqual([1052]);
    expect(isNewOrder(order({ number: 1, status: "preparing" }), "12:01")).toBe(false);
  });

  it("formats the elapsed badge, red when delayed and green once delivered", () => {
    expect(formatElapsed(0)).toBe("ahora");
    expect(formatElapsed(6)).toBe("hace 6 min");
    expect(getElapsedBadge(byId(1051), NOW)).toEqual({ label: "hace 6 min", tone: "neutral" });
    expect(getElapsedBadge(byId(1048), NOW)).toEqual({ label: "hace 38 min", tone: "danger" });
    expect(getElapsedBadge(byId(1047), NOW)).toEqual({ label: "hace 46 min", tone: "success" });
  });

  it("formats the received line of the detail panel", () => {
    expect(formatReceivedLine(byId(1048), NOW)).toEqual({ label: "Recibido 14:04 · hace 38 min", delayed: true });
    expect(formatReceivedLine(byId(1051), NOW)).toEqual({ label: "Recibido 14:36 · hace 6 min", delayed: false });
  });
});

describe("getAlertMetrics", () => {
  it("adds the context sublabel of each kitchen stage", () => {
    expect(getAlertMetrics(board, NOW)).toEqual([
      { id: "received", label: "Recibidos", value: 2, detail: "1 nuevo", tone: "brand" },
      { id: "preparing", label: "En preparación", value: 2, detail: "1 demorado", tone: "warning" },
      { id: "delivered", label: "Entregados", value: 1, detail: "últimos 30 min", tone: "success" },
    ]);
  });

  it("pluralizes and handles quiet stages", () => {
    const orders = [
      order({ number: 1, receivedAt: "12:00" }),
      order({ number: 2, receivedAt: "12:01" }),
      order({ number: 3, receivedAt: "11:00", status: "preparing" }),
      order({ number: 4, receivedAt: "11:10", status: "preparing" }),
    ];
    expect(getAlertMetrics(orders, "12:02").map((metric) => metric.detail)).toEqual([
      "2 nuevos",
      "2 demorados",
      "últimos 30 min",
    ]);
    expect(getAlertMetrics([], "12:02").map((metric) => metric.detail)).toEqual([
      "sin nuevos",
      "a tiempo",
      "últimos 30 min",
    ]);
  });
});

describe("quick filters and search", () => {
  const base = { query: "", quickFilter: "all", showDelivered: true, now: NOW } as const;

  it("counts the chips over the board", () => {
    expect(countQuickFilters(board, NOW)).toEqual({ all: 5, delayed: 1 });
  });

  it("keeps every board order with 'Todos' and only delayed ones with 'Demorados'", () => {
    expect(ids(filterBoardOrders(board, base))).toEqual([1047, 1048, 1050, 1051, 1052]);
    expect(ids(filterBoardOrders(board, { ...base, quickFilter: "delayed" }))).toEqual([1048]);
  });

  it("hides delivered orders when they are not visible and always drops cancelled ones", () => {
    const withCancelled = [...board, order({ number: 2000, status: "cancelled" })];
    expect(ids(filterBoardOrders(withCancelled, { ...base, showDelivered: false }))).toEqual([1048, 1050, 1051, 1052]);
  });

  it("searches by order number, with or without #", () => {
    expect(ids(filterBoardOrders(board, { ...base, query: "1051" }))).toEqual([1051]);
    expect(ids(filterBoardOrders(board, { ...base, query: " #105 " }))).toEqual([1050, 1051, 1052]);
  });

  it("searches by table number or space", () => {
    expect(ids(filterBoardOrders(board, { ...base, query: "Mesa 3" }))).toEqual([1051]);
    expect(ids(filterBoardOrders(board, { ...base, query: "mesa 07" }))).toEqual([1048]);
    expect(ids(filterBoardOrders(board, { ...base, query: "terraza" }))).toEqual([1047, 1052]);
  });

  it("searches by customer, ignoring case and accents", () => {
    expect(ids(filterBoardOrders(board, { ...base, query: "martina" }))).toEqual([1051]);
    expect(ids(filterBoardOrders(board, { ...base, query: "TOMAS" }))).toEqual([1052]);
  });

  it("combines the search with the quick filter", () => {
    expect(ids(filterBoardOrders(board, { ...base, query: "sofía", quickFilter: "delayed" }))).toEqual([]);
    expect(ids(filterBoardOrders(board, { ...base, query: "9999" }))).toEqual([]);
  });
});

describe("keepRecentDelivered", () => {
  it("keeps delivered orders on the board for 30 minutes after their delivery", () => {
    const delivered = (number: number, at: string) =>
      order({ number, status: "delivered", history: [{ kind: "received", at: "11:00" }, { kind: "delivered", at }] });
    const orders = [order({ number: 1, receivedAt: "09:00" }), delivered(2, "12:00"), delivered(3, "11:30")];
    expect(ids(keepRecentDelivered(orders, "12:00"))).toEqual([1, 2, 3]);
    expect(ids(keepRecentDelivered(orders, "12:30"))).toEqual([1, 2]);
    expect(ids(keepRecentDelivered(board, NOW))).toEqual([1047, 1048, 1050, 1051, 1052]);
  });
});

describe("sortNewestFirst", () => {
  it("puts the latest orders on top of each column, like the export", () => {
    expect(ids(sortNewestFirst(board))).toEqual([1052, 1051, 1050, 1048, 1047]);
    expect(ids(board)).toEqual([1047, 1048, 1050, 1051, 1052]);
  });
});

describe("card and panel copy", () => {
  it("formats the table with its space", () => {
    expect(formatOrderLocation(byId(1051))).toBe("Mesa 03 - Salón · Martina");
    expect(formatOrderLocation(order({ number: 1, tableNumber: 4 }))).toBe("Mesa 04 · Ana");
    expect(formatOrderLocation(order({ number: 1, tableNumber: 4, customer: "" }))).toBe("Mesa 04");
  });

  it("uses the chosen options and the line note as the item note", () => {
    expect(getItemNote(byId(1051).items[0])).toBe("Leche deslactosada");
    expect(getItemNote(byId(1051).items[1])).toBeNull();
    const item = { id: "i", quantity: 1, name: "Latte", unitPrice: 4500 };
    expect(getItemNote({ ...item, note: "Bien caliente" })).toBe("Bien caliente");
    expect(getItemNote({ ...item, customization: "Grande", note: "Bien caliente" })).toBe("Grande · Bien caliente");
  });

  it("labels the panel's primary action of each stage", () => {
    expect(getPanelAction(byId(1051))).toEqual({ label: "Comenzar preparación", tone: "brand" });
    expect(getPanelAction(byId(1048))).toEqual({ label: "Marcar como entregado", tone: "warning" });
    expect(getPanelAction(byId(1047))).toBeNull();
  });

  it("selects the oldest delayed order first, then the oldest received one", () => {
    expect(getDefaultSelectedOrderId(board, NOW)).toBe("order-1048");
    expect(getDefaultSelectedOrderId(board, "14:20")).toBe("order-1051");
    expect(getDefaultSelectedOrderId([byId(1047)], NOW)).toBe("order-1047");
    expect(getDefaultSelectedOrderId([], NOW)).toBeNull();
  });
});

describe("getOrderTimeline", () => {
  it("lists the history and closes with the current delay", () => {
    expect(getOrderTimeline(byId(1048), NOW)).toEqual([
      { id: "confirmed-0", time: "14:04", label: "Pedido recibido", tone: "brand" },
      { id: "received-1", time: "14:04", label: "Confirmado por María", tone: "brand" },
      { id: "preparing-2", time: "14:08", label: "Preparación iniciada", tone: "warning" },
      { id: "delay", time: "Ahora", label: "Demorado +18 min", tone: "danger" },
    ]);
  });

  it("labels deliveries, cancellations and unattributed confirmations", () => {
    const finished = order({
      number: 1,
      status: "delivered",
      history: [
        { kind: "confirmed", at: "12:00" },
        { kind: "received", at: "12:00" },
        { kind: "preparing", at: "12:03" },
        { kind: "delivered", at: "12:15" },
      ],
    });
    expect(getOrderTimeline(finished, "13:00").map((entry) => entry.label)).toEqual([
      "Pedido recibido",
      "Confirmado en cocina",
      "Preparación iniciada",
      "Pedido entregado",
    ]);
    const cancelled = order({ number: 2, status: "cancelled", history: [{ kind: "cancelled", at: "12:05" }] });
    expect(getOrderTimeline(cancelled, "13:00")).toEqual([
      { id: "cancelled-0", time: "12:05", label: "Pedido cancelado", tone: "danger" },
    ]);
  });
});
