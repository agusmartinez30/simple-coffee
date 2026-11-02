import { describe, expect, it } from "vitest";
import { getColumnTabs, pickActiveTab } from "./board-tabs";
import { buildOrder } from "./order-fixtures";
import { groupOrdersByColumn, type OrderColumn } from "./orders-view";

function columnsWith(counts: { received: number; preparing: number; delivered?: number }): OrderColumn[] {
  const make = (status: "received" | "preparing" | "delivered", count: number) =>
    Array.from({ length: count }, (_, index) => ({ ...buildOrder({ number: index + 1 }), id: `${status}-${index}`, status }));
  const orders = [
    ...make("received", counts.received),
    ...make("preparing", counts.preparing),
    ...make("delivered", counts.delivered ?? 0),
  ];
  return groupOrdersByColumn(orders, { showDelivered: counts.delivered !== undefined });
}

describe("getColumnTabs", () => {
  it("labels one tab per visible column with its count", () => {
    expect(getColumnTabs(columnsWith({ received: 2, preparing: 0, delivered: 1 }))).toEqual([
      { id: "received", label: "Recibidos", count: 2, tone: "brand" },
      { id: "preparing", label: "En preparación", count: 0, tone: "warning" },
      { id: "delivered", label: "Entregados", count: 1, tone: "success" },
    ]);
  });

  it("leaves the delivered tab out when the delivered column is hidden", () => {
    expect(getColumnTabs(columnsWith({ received: 1, preparing: 1 })).map((tab) => tab.id)).toEqual([
      "received",
      "preparing",
    ]);
  });
});

describe("pickActiveTab", () => {
  it("defaults to the first non-empty column", () => {
    expect(pickActiveTab(columnsWith({ received: 0, preparing: 3, delivered: 1 }), null)).toBe("preparing");
  });

  it("defaults to the first column when every column is empty", () => {
    expect(pickActiveTab(columnsWith({ received: 0, preparing: 0, delivered: 0 }), null)).toBe("received");
  });

  it("keeps the chosen tab while its column is visible, even when empty", () => {
    expect(pickActiveTab(columnsWith({ received: 2, preparing: 0, delivered: 0 }), "delivered")).toBe("delivered");
  });

  it("falls back to the default when the chosen column is hidden", () => {
    expect(pickActiveTab(columnsWith({ received: 0, preparing: 1 }), "delivered")).toBe("preparing");
  });

  it("returns null without columns", () => {
    expect(pickActiveTab([], "received")).toBeNull();
  });
});
