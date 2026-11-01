import { describe, expect, it } from "vitest";
import { SEED_ORDERS } from "@/mocks/table";
import {
  buildOrder,
  getNextOrderNumber,
  initialSession,
  parseStoredSession,
  selectOrderById,
  selectTableTotal,
  tableSessionReducer,
  type PlaceOrderInput,
} from "./table-session-reducer";

const input: PlaceOrderInput = {
  customerName: "  Sofía ",
  note: " Todo junto, por favor. ",
  time: "12:30",
  lines: [
    { productId: "cappuccino", choiceIds: ["mediano", "almendras"], quantity: 1, note: "Poco caliente" },
    { productId: "medialunas", choiceIds: [], quantity: 2 },
  ],
};

describe("initialSession", () => {
  it("starts with the seed orders", () => {
    expect(initialSession).toEqual({ orders: SEED_ORDERS });
  });
});

describe("getNextOrderNumber", () => {
  it("continues after the highest order number", () => {
    expect(getNextOrderNumber(SEED_ORDERS)).toBe("1043");
  });

  it("starts at 1001 without orders", () => {
    expect(getNextOrderNumber([])).toBe("1001");
  });
});

describe("buildOrder", () => {
  it("creates an order with menu prices, trimmed name and note", () => {
    const result = buildOrder(initialSession, input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order).toMatchObject({
      id: "order-1043",
      number: "1043",
      customerName: "Sofía",
      note: "Todo junto, por favor.",
      time: "12:30",
    });
    expect(result.order).not.toHaveProperty("status");
    expect(result.order.lines).toEqual([
      {
        productId: "cappuccino",
        name: "Cappuccino",
        quantity: 1,
        unitPrice: 5400,
        customization: "Mediano · Leche de almendras",
        note: "Poco caliente",
      },
      {
        productId: "medialunas",
        name: "Medialunas",
        quantity: 2,
        unitPrice: 3800,
        customization: undefined,
        note: undefined,
      },
    ]);
  });

  it("skips lines whose product no longer exists", () => {
    const result = buildOrder(initialSession, {
      ...input,
      lines: [...input.lines, { productId: "ghost", choiceIds: [], quantity: 1 }],
    });
    expect(result.ok && result.order.lines).toHaveLength(2);
  });

  it("rejects a blank customer name", () => {
    expect(buildOrder(initialSession, { ...input, customerName: "   " })).toEqual({
      ok: false,
      reason: "missing-name",
    });
  });

  it("rejects an order without valid lines", () => {
    expect(buildOrder(initialSession, { ...input, lines: [] })).toEqual({
      ok: false,
      reason: "empty",
    });
  });
});

describe("tableSessionReducer", () => {
  it("appends a placed order, which then counts in the table total", () => {
    const result = buildOrder(initialSession, input);
    if (!result.ok) throw new Error("expected a valid order");
    const state = tableSessionReducer(initialSession, { type: "addOrder", order: result.order });
    expect(state.orders).toHaveLength(2);
    expect(selectOrderById(state, "order-1043")?.customerName).toBe("Sofía");
    expect(selectTableTotal(state)).toBe(13000 + 5400 + 7600);
  });

  it("ignores an order whose id already exists", () => {
    const state = tableSessionReducer(initialSession, { type: "addOrder", order: SEED_ORDERS[0] });
    expect(state).toBe(initialSession);
  });

  it("resets to the initial session", () => {
    const changed = tableSessionReducer(initialSession, {
      type: "addOrder",
      order: { ...SEED_ORDERS[0], id: "order-1043", number: "1043" },
    });
    expect(tableSessionReducer(changed, { type: "reset" })).toEqual(initialSession);
  });

  it("replaces the state on hydrate", () => {
    const stored = { orders: [] };
    expect(tableSessionReducer(initialSession, { type: "hydrate", state: stored })).toBe(stored);
  });
});

describe("selectOrderById", () => {
  it("returns undefined for an unknown id", () => {
    expect(selectOrderById(initialSession, "order-0")).toBeUndefined();
  });
});

describe("parseStoredSession", () => {
  it("round-trips a serialized session", () => {
    const raw = JSON.stringify(initialSession);
    expect(parseStoredSession(raw)).toEqual(initialSession);
  });

  it("accepts orders stored without a status", () => {
    const { id, number, customerName, time, lines } = SEED_ORDERS[0];
    const stored = { id: `${id}-stored`, number, customerName, time, lines };
    const raw = JSON.stringify({ orders: [stored] });
    expect(parseStoredSession(raw).orders.map((order) => order.id)).toEqual(["order-1042-stored"]);
  });

  it("falls back to the initial session on missing or malformed data", () => {
    expect(parseStoredSession(null)).toBe(initialSession);
    expect(parseStoredSession("{oops")).toBe(initialSession);
    expect(parseStoredSession(JSON.stringify({ orders: "x" }))).toBe(initialSession);
    expect(parseStoredSession(JSON.stringify({ orders: [{ id: 1 }] }))).toBe(initialSession);
  });
});
