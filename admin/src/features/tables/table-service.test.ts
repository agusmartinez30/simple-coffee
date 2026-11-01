import { describe, expect, it } from "vitest";
import { SERVICE_DAY, deriveTable, getCollectionsHistory, getOpenSession } from "@/mocks/service-day";
import { assignOrder, closeTable } from "./table-service";

const day = SERVICE_DAY;
const at = day.now;

describe("assignOrder", () => {
  it("adds a received order, priced from the catalogue, to the open session of a seated table", () => {
    const before = deriveTable(day, 2);
    const next = assignOrder(day, {
      tableNumber: 2,
      lines: [
        { productId: "cappuccino", quantity: 1 },
        { productId: "medialuna", quantity: 2 },
      ],
      note: "  Sin azúcar  ",
      customer: "Sofía M.",
      at,
    });
    const order = next.orders.at(-1);
    expect(order).toMatchObject({
      id: Math.max(...day.orders.map((item) => item.id)) + 1,
      sessionId: getOpenSession(day, 2)?.id,
      tableNumber: 2,
      customer: "Sofía M.",
      receivedAt: at,
      note: "Sin azúcar",
      status: "received",
      history: [
        { kind: "confirmed", at },
        { kind: "received", at },
      ],
    });
    expect(order?.items).toEqual([
      { id: `${order?.id}-1`, productId: "cappuccino", quantity: 1, name: "Cappuccino", unitPrice: 4600 },
      { id: `${order?.id}-2`, productId: "medialuna", quantity: 2, name: "Medialunas", unitPrice: 3900 },
    ]);
    const after = deriveTable(next, 2);
    expect(after.accountTotal).toBe(before.accountTotal + 4600 + 7800);
    expect(after.confirmedOrders).toBe(before.confirmedOrders + 1);
    expect(after.pendingKitchenOrders).toBe(before.pendingKitchenOrders + 1);
  });

  it("opens a new session when the table is free, so it shows as seated from now", () => {
    expect(deriveTable(day, 1).status).toBe("available");
    const next = assignOrder(day, { tableNumber: 1, lines: [{ productId: "limonada", quantity: 1 }], note: "", customer: "Sofía M.", at });
    const session = getOpenSession(next, 1);
    expect(session).toEqual({ id: "S-2026-10-21-01-3", tableNumber: 1, date: day.date, openedAt: at, closedAt: undefined });
    expect(next.orders.at(-1)?.note).toBeUndefined();
    expect(deriveTable(next, 1)).toMatchObject({ status: "occupied", accountTotal: 3600, seatedMinutes: 0 });
  });

  it("leaves the day untouched without lines, with an unknown product or at a table that is not live", () => {
    const base = { note: "", customer: "Sofía M.", at };
    expect(assignOrder(day, { ...base, tableNumber: 2, lines: [] })).toBe(day);
    expect(assignOrder(day, { ...base, tableNumber: 2, lines: [{ productId: "nope", quantity: 1 }] })).toBe(day);
    expect(assignOrder(day, { ...base, tableNumber: 99, lines: [{ productId: "cappuccino", quantity: 1 }] })).toBe(day);
  });

  it("never mutates the given day", () => {
    const orders = day.orders.length;
    const sessions = day.sessions.length;
    assignOrder(day, { tableNumber: 1, lines: [{ productId: "cappuccino", quantity: 1 }], note: "", customer: "Sofía M.", at });
    expect(day.orders).toHaveLength(orders);
    expect(day.sessions).toHaveLength(sessions);
  });
});

describe("closeTable", () => {
  const charge = { at, confirmedBy: "Sofía M.", method: "transfer", tip: 0 } as const;

  it("collects a table that asked for the bill with the chosen method, finalizes the request and frees the table", () => {
    const account = deriveTable(day, 10).accountTotal;
    const next = closeTable(day, { ...charge, tableNumber: 10 });
    expect(deriveTable(next, 10).status).toBe("available");
    expect(next.billRequests.find((request) => request.id === "SC-010")).toMatchObject({
      status: "finalized",
      assignee: "Sofía M.",
    });
    const collection = next.collections.at(-1);
    expect(collection).toMatchObject({
      number: Math.max(...day.collections.map((item) => item.number)) + 1,
      time: at,
      method: "transfer",
      customerPreference: "transfer",
      confirmedBy: "Sofía M.",
      adjustments: 0,
    });
    expect(collection).not.toHaveProperty("tip");
    const collected = getCollectionsHistory(next).collections.find((item) => item.tableNumber === 10 && item.time === at);
    expect(collected?.amount).toBe(account);
  });

  it("records the method staff chose even when it differs from the customer's preference", () => {
    const next = closeTable(day, { ...charge, tableNumber: 10, method: "cash" });
    expect(next.collections.at(-1)).toMatchObject({ method: "cash", customerPreference: "transfer" });
  });

  it("collects a seated table without a bill request as a register preference", () => {
    const next = closeTable(day, { ...charge, tableNumber: 2, method: "card" });
    expect(deriveTable(next, 2).status).toBe("available");
    expect(next.collections.at(-1)).toMatchObject({ method: "card", customerPreference: "register" });
  });

  it("records the tip apart from the bill, so the collected amount stays the table's account", () => {
    const account = deriveTable(day, 2).accountTotal;
    const next = closeTable(day, { ...charge, tableNumber: 2, tip: 1500 });
    expect(next.collections.at(-1)).toMatchObject({ tip: 1500, adjustments: 0 });
    const collected = getCollectionsHistory(next).collections.find((item) => item.tableNumber === 2 && item.time === at);
    expect(collected?.amount).toBe(account);
  });

  it("treats a negative tip as no tip", () => {
    const next = closeTable(day, { ...charge, tableNumber: 2, tip: -200 });
    expect(next.collections.at(-1)).not.toHaveProperty("tip");
  });

  it("leaves the day untouched for a free table", () => {
    expect(closeTable(day, { ...charge, tableNumber: 1 })).toBe(day);
  });
});
