import { describe, expect, it } from "vitest";
import { getOrderTotal } from "@/features/orders/orders-view";
import {
  BILL_REQUESTS_BOARD,
  COLLECTIONS_HISTORY,
  DELIVERED_BOARD_WINDOW_MINUTES,
  ORDERS_BOARD,
  PAYMENT_METHODS,
  REQUEST_MODES,
  SERVICE_DAY,
  VENUE_SPACES,
  TABLES_BOARD,
  minutesBetween,
} from "./index";

const day = SERVICE_DAY;
const openSessions = day.sessions.filter((session) => !session.closedAt);
const openSessionIds = new Set(openSessions.map((session) => session.id));
const sessionOf = (id: string) => day.sessions.find((session) => session.id === id);
const ordersOf = (sessionId: string) =>
  day.orders.filter((order) => order.sessionId === sessionId && order.status !== "cancelled");
const tableOf = (number: number) => TABLES_BOARD.tables.find((table) => table.number === number);
const requestOf = (number: number) => BILL_REQUESTS_BOARD.requests.find((request) => request.tableNumber === number);

describe("minutesBetween", () => {
  it("counts minutes between two local times", () => {
    expect(minutesBetween("12:42", "13:00")).toBe(18);
    expect(minutesBetween("13:58", "14:02")).toBe(4);
  });
});

describe("service day data", () => {
  it("prices every order item from the catalogue", () => {
    for (const order of day.orders) {
      for (const item of order.items) {
        const product = day.products.find((candidate) => candidate.id === item.productId);
        expect(product, item.id).toBeDefined();
        expect(item.unitPrice, item.id).toBe(product?.price);
      }
    }
  });

  it("uses unique ids for orders, sessions, bill requests and collections", () => {
    for (const ids of [
      day.orders.map((order) => String(order.id)),
      day.sessions.map((session) => session.id),
      day.billRequests.map((request) => request.id),
      day.collections.map((collection) => String(collection.number)),
    ]) {
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("keeps every order inside its table session", () => {
    for (const order of day.orders) {
      const session = sessionOf(order.sessionId);
      expect(session, `#${order.id}`).toBeDefined();
      expect(order.tableNumber, `#${order.id}`).toBe(session?.tableNumber);
      expect(order.receivedAt >= (session?.openedAt ?? ""), `#${order.id}`).toBe(true);
      if (session?.closedAt) expect(order.status, `#${order.id}`).toBe("delivered");
      for (const event of order.history) {
        expect(event.at >= order.receivedAt && event.at <= (session?.closedAt ?? day.now), `#${order.id}`).toBe(true);
      }
    }
  });

  it("seats at most one session per table and never overlaps sessions of the same table", () => {
    for (const number of day.tableNumbers) {
      expect(openSessions.filter((session) => session.tableNumber === number).length).toBeLessThanOrEqual(1);
      const today = day.sessions
        .filter((session) => session.tableNumber === number && session.date === day.date)
        .sort((a, b) => a.openedAt.localeCompare(b.openedAt));
      today.forEach((session, index) => {
        if (index === 0) return;
        expect(session.openedAt > (today[index - 1].closedAt ?? "99:99"), session.id).toBe(true);
      });
    }
  });

  it("never seats the same customer at two tables at the same time", () => {
    const tablesByCustomer = new Map<string, Set<number>>();
    for (const order of day.orders.filter((item) => openSessionIds.has(item.sessionId))) {
      tablesByCustomer.set(order.customer, (tablesByCustomer.get(order.customer) ?? new Set()).add(order.tableNumber));
    }
    for (const [customer, tables] of tablesByCustomer) expect(tables.size, customer).toBe(1);
  });

  it("asks for the bill on behalf of a customer of the session, at most once per session", () => {
    for (const request of day.billRequests) {
      expect(ordersOf(request.sessionId).map((order) => order.customer), request.id).toContain(request.customer);
      expect(day.billRequests.filter((item) => item.sessionId === request.sessionId)).toHaveLength(1);
      if (request.status !== "pending") expect(day.staff.map((member) => member.name)).toContain(request.assignee);
      expect(request.history[0]).toEqual({ kind: "requested", at: request.requestedAt });
      expect(request.history.map((event) => event.at)).toEqual(
        [...request.history].map((event) => event.at).sort((a, b) => a.localeCompare(b)),
      );
      for (const event of request.history) {
        expect(event.at >= request.requestedAt && event.at <= day.now, `${request.id}:${event.kind}`).toBe(true);
        if (event.by) expect(day.staff.map((member) => member.name)).toContain(event.by);
      }
    }
  });
});

describe("tables (02) agree with orders (03) and bill requests (04)", () => {
  it("derives every table's status, counts and total from its open session", () => {
    for (const number of day.tableNumbers) {
      const table = tableOf(number);
      const session = openSessions.find((item) => item.tableNumber === number);
      const request = day.billRequests.find((item) => item.sessionId === session?.id && item.status !== "finalized");
      const orders = session ? ordersOf(session.id) : [];
      expect(table?.status, `Mesa ${number}`).toBe(!session ? "available" : request ? "bill-requested" : "occupied");
      expect(table?.confirmedOrders, `Mesa ${number}`).toBe(orders.length);
      expect(table?.pendingKitchenOrders, `Mesa ${number}`).toBe(
        orders.filter((order) => order.status === "received" || order.status === "preparing").length,
      );
      expect(table?.accountTotal, `Mesa ${number}`).toBe(orders.reduce((sum, order) => sum + getOrderTotal(order), 0));
    }
  });

  it("shows the same account, kitchen count, preference and wait in 02 and 04", () => {
    for (const table of TABLES_BOARD.tables.filter((item) => item.status === "bill-requested")) {
      expect(requestOf(table.number), `Mesa ${table.number}`).toMatchObject({
        total: table.accountTotal,
        confirmedOrders: table.confirmedOrders,
        ordersInPreparation: table.pendingKitchenOrders,
        paymentPreference: table.paymentPreference,
        waitMinutes: table.billRequestedMinutesAgo,
      });
    }
    const activeTables = BILL_REQUESTS_BOARD.requests.filter((request) => request.status !== "finalized");
    expect(activeTables.map((request) => tableOf(request.tableNumber)?.status)).toEqual(
      activeTables.map(() => "bill-requested"),
    );
  });

  it("puts every unfinished order of a seated table on the kitchen board, and nothing else", () => {
    const unfinished = day.orders.filter(
      (order) => openSessionIds.has(order.sessionId) && (order.status === "received" || order.status === "preparing"),
    );
    for (const order of unfinished) expect(ORDERS_BOARD.orders.map((item) => item.id)).toContain(order.id);
    for (const order of ORDERS_BOARD.orders) {
      expect(tableOf(order.tableNumber)?.status, `#${order.id}`).not.toBe("available");
      if (order.status === "delivered") {
        const deliveredAt = order.history.find((event) => event.kind === "delivered")?.at ?? "";
        expect(minutesBetween(deliveredAt, day.now)).toBeLessThanOrEqual(DELIVERED_BOARD_WINDOW_MINUTES);
      }
    }
  });

  it("measures 04 waits from the request time to now", () => {
    for (const request of BILL_REQUESTS_BOARD.requests.filter((item) => item.status !== "finalized")) {
      expect(request.waitMinutes, request.id).toBe(minutesBetween(request.requestedAt, day.now));
    }
  });

  it("derives every consumption and payment verification fact without changing shared totals", () => {
    for (const request of BILL_REQUESTS_BOARD.requests) {
      expect(request.consumptions.reduce((sum, item) => sum + item.total, 0), request.id).toBe(request.total);
      expect(request.consumptions.every((item) => item.quantity > 0 && item.unitPrice > 0), request.id).toBe(true);
      if (request.paymentVerification.status === "pending") {
        expect(request.paymentPreference, request.id).toBe("transfer");
        expect(request.history.some((event) => event.kind === "receipt-reported"), request.id).toBe(true);
      }
    }
  });
});

describe("bill requests (04) and collections (05)", () => {
  it("closes every finalized request with a collection of the same total, preference and staff member", () => {
    for (const request of day.billRequests.filter((item) => item.status === "finalized")) {
      const collection = day.collections.find((item) => item.sessionId === request.sessionId);
      const row = COLLECTIONS_HISTORY.collections.find((item) => item.id === `COB-${String(collection?.number).padStart(4, "0")}`);
      const board = BILL_REQUESTS_BOARD.requests.find((item) => item.id === request.id);
      expect(row, request.id).toBeDefined();
      expect(row?.amount).toBe(board?.total);
      expect(row?.customerPreference).toBe(request.paymentPreference);
      expect(row?.confirmedBy).toBe(request.assignee);
      expect(row?.tableNumber).toBe(board?.tableNumber);
      expect(board?.waitMinutes).toBe(minutesBetween(request.requestedAt, collection?.time ?? ""));
    }
  });

  it("only collects closed sessions, never one with an active request", () => {
    for (const collection of day.collections) {
      const session = sessionOf(collection.sessionId);
      expect(session?.closedAt, `#${collection.number}`).toBeDefined();
      expect(collection.time <= (session?.closedAt ?? "")).toBe(true);
      expect(
        day.billRequests.some((request) => request.sessionId === collection.sessionId && request.status !== "finalized"),
      ).toBe(false);
    }
    for (const session of day.sessions.filter((item) => item.closedAt)) {
      expect(day.collections.filter((item) => item.sessionId === session.id), session.id).toHaveLength(1);
    }
  });

  it("settles each collection with its session's orders", () => {
    for (const row of COLLECTIONS_HISTORY.collections) {
      const collection = day.collections.find((item) => `COB-${String(item.number).padStart(4, "0")}` === row.id);
      const orders = ordersOf(collection?.sessionId ?? "");
      expect(row.orders.map((order) => order.id)).toEqual(orders.map((order) => order.id));
      expect(row.amount).toBe(orders.reduce((sum, order) => sum + getOrderTotal(order), 0) + row.adjustments);
    }
  });

  it("only uses payment methods and request modes enabled in 06", () => {
    const { methods, requestModes } = day.paymentSettings.settings;
    for (const collection of day.collections) {
      expect(methods[collection.method], `#${collection.number}`).toBe(true);
      expect(requestModes[collection.customerPreference], `#${collection.number}`).toBe(true);
    }
    for (const request of day.billRequests) expect(requestModes[request.paymentPreference], request.id).toBe(true);
    expect(PAYMENT_METHODS.map((method) => method.label)).toEqual(["Efectivo", "Tarjeta", "Transferencia", "Otro"]);
    expect(REQUEST_MODES.map((mode) => mode.label)).toEqual(["En mesa", "En caja", "Por transferencia"]);
  });

  it("confirms collections with members of the staff", () => {
    for (const collection of day.collections) {
      expect(day.staff.map((member) => member.name)).toContain(collection.confirmedBy);
    }
  });
});

describe("venue tables (09)", () => {
  const tables = day.tables;

  it("configures the twelve tables of 02 with the 09A spaces and capacities", () => {
    expect(tables.map((table) => table.label)).toEqual(
      Array.from({ length: 12 }, (_, index) => `Mesa ${String(index + 1).padStart(2, "0")}`),
    );
    expect(tables.map((table) => table.spaceId)).toEqual([
      "salon", "salon", "salon", "salon", "terraza", "terraza",
      "salon", "terraza", "patio", "patio", "patio", "patio",
    ]);
    expect(tables.map((table) => table.capacity)).toEqual([2, 4, 4, 2, 4, 2, 4, 6, 4, 6, 4, 2]);
    expect(VENUE_SPACES.map((space) => space.name)).toEqual(["Salón", "Terraza", "Patio"]);
    expect(day.spaces).toBe(VENUE_SPACES);
  });

  it("uses unique, stable ids, numbers and labels", () => {
    for (const values of <unknown[][]>[
      tables.map((table) => table.id),
      tables.map((table) => table.number),
      tables.map((table) => table.label.toLowerCase()),
    ]) {
      expect(new Set(values).size).toBe(values.length);
    }
    for (const table of tables) expect(table.id).toBe(`tbl_${String(table.number).padStart(2, "0")}`);
  });

  it("shows exactly the enabled tables on the live screens", () => {
    expect(day.tableNumbers).toEqual(tables.filter((table) => table.enabled).map((table) => table.number));
    expect(TABLES_BOARD.tables.map((table) => table.number)).toEqual(day.tableNumbers);
  });

  it("seats sessions only at configured tables", () => {
    const numbers = new Set(tables.map((table) => table.number));
    for (const session of day.sessions) expect(numbers.has(session.tableNumber), session.id).toBe(true);
  });

  it("places every table in a configured space, with unique space ids and names", () => {
    const spaceIds = day.spaces.map((space) => space.id);
    expect(new Set(spaceIds).size).toBe(spaceIds.length);
    expect(new Set(day.spaces.map((space) => space.name.toLowerCase())).size).toBe(day.spaces.length);
    for (const table of tables) expect(spaceIds, table.id).toContain(table.spaceId);
    // 09A space cards: Salón 5 mesas, Terraza 3, Patio 4.
    expect(day.spaces.map((space) => tables.filter((table) => table.spaceId === space.id).length)).toEqual([5, 3, 4]);
  });

  it("never reuses a QR token, active or revoked", () => {
    const tokens = tables.flatMap((table) => [
      ...(table.qr ? [table.qr.token] : []),
      ...table.revokedQrs.map((credential) => credential.token),
    ]);
    expect(new Set(tokens).size).toBe(tokens.length);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9]{10}$/);
  });

  it("gives Mesa 07 the 09B/09C credential and its rotation history", () => {
    const table = tables.find((candidate) => candidate.id === "tbl_07");
    expect(table).toMatchObject({ label: "Mesa 07", description: "Cerca de la ventana", version: 18 });
    expect(table?.qr).toEqual({ token: "4pX9kR2mL7", generatedOn: day.date, generatedBy: "Sofía M." });
    expect(table?.revokedQrs.map((credential) => credential.auditId)).toEqual(["QR-118"]);
  });

  it("generates and rotates credentials with members of the staff, never in the future", () => {
    const staff = day.staff.map((member) => member.name);
    for (const table of tables) {
      for (const credential of [...(table.qr ? [table.qr] : []), ...table.revokedQrs]) {
        expect(staff, table.id).toContain(credential.generatedBy);
        expect(credential.generatedOn <= day.date, table.id).toBe(true);
      }
      for (const credential of table.revokedQrs) {
        expect(credential.generatedOn <= credential.revokedOn, table.id).toBe(true);
        expect(credential.revokedOn <= (table.qr?.generatedOn ?? day.date), table.id).toBe(true);
      }
    }
  });
});

describe("floor plan (02)", () => {
  it("times every seated table from its session to now", () => {
    for (const table of TABLES_BOARD.tables) {
      const session = openSessions.find((item) => item.tableNumber === table.number);
      expect(table.seatedMinutes, `Mesa ${table.number}`).toBe(session ? minutesBetween(session.openedAt, day.now) : undefined);
    }
  });

  it("places the tables where the 02 export draws them, sized by their box, never overlapping within a space", () => {
    const columns = [38, 222, 406, 590];
    const rows = [64, 236, 408];
    for (const table of day.tables) {
      const index = table.number - 1;
      expect(table.layout, table.id).toEqual({
        x: columns[index % 4],
        y: rows[Math.floor(index / 4)],
        // Mesa 08 (six seats, Terraza) is a longer rectangle; the rest use the 150×132 box.
        width: table.number === 8 ? 184 : 150,
        height: 132,
        shape: table.spaceId === "patio" ? "round" : "rect",
      });
    }
    for (const a of day.tables) {
      for (const b of day.tables) {
        if (a.id >= b.id || a.spaceId !== b.spaceId) continue;
        const [left, right] = a.layout.x <= b.layout.x ? [a.layout, b.layout] : [b.layout, a.layout];
        const [top, bottom] = a.layout.y <= b.layout.y ? [a.layout, b.layout] : [b.layout, a.layout];
        const apart = right.x - left.x >= left.width || bottom.y - top.y >= top.height;
        expect(apart, `${a.id} / ${b.id}`).toBe(true);
      }
    }
  });
});
