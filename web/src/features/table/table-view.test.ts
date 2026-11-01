import { describe, expect, it } from "vitest";
import { SEED_ORDERS } from "@/mocks/table";
import type { TableOrder } from "@/mocks/types";
import { getTableView, TABLE_FORCED_STATES } from "./table-view";

const cancelledOnly: TableOrder[] = [{ ...SEED_ORDERS[0], status: "cancelled" }];

describe("getTableView", () => {
  it("shows the order summary while the table has active orders", () => {
    expect(getTableView({ orders: SEED_ORDERS }, null)).toBe("open");
  });

  it("shows the empty state when the table has no active orders", () => {
    expect(getTableView({ orders: [] }, null)).toBe("empty");
    expect(getTableView({ orders: cancelledOnly }, null)).toBe("empty");
  });

  it("lets a forced state override the orders", () => {
    expect(getTableView({ orders: SEED_ORDERS }, "error")).toBe("error");
    expect(getTableView({ orders: SEED_ORDERS }, "empty")).toBe("empty");
  });

  it("only accepts the empty and error forced states", () => {
    expect(TABLE_FORCED_STATES).toEqual(["empty", "error"]);
  });
});
