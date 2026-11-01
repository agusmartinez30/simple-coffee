import { describe, expect, it } from "vitest";
import { SEED_ORDERS } from "@/mocks/table";
import type { TableOrder } from "@/mocks/types";
import { formatOrderCount, getTableSummary } from "./table-summary";

const second: TableOrder = { ...SEED_ORDERS[0], id: "order-1050", number: "1050" };

describe("getTableSummary", () => {
  it("computes total and orders from the seed orders", () => {
    expect(getTableSummary(SEED_ORDERS)).toEqual({ total: 13_000, orderCount: 1 });
  });

  it("counts every order in every figure", () => {
    expect(getTableSummary([...SEED_ORDERS, second])).toEqual({ total: 26_000, orderCount: 2 });
  });

  it("returns zeros for a table without orders", () => {
    expect(getTableSummary([])).toEqual({ total: 0, orderCount: 0 });
  });
});

describe("formatOrderCount", () => {
  it("pluralizes orders", () => {
    expect(formatOrderCount(0)).toBe("0 pedidos");
    expect(formatOrderCount(1)).toBe("1 pedido");
    expect(formatOrderCount(2)).toBe("2 pedidos");
  });
});
