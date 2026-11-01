import { describe, expect, it } from "vitest";
import { SEED_ORDERS } from "@/mocks/table";
import { getTableView, TABLE_FORCED_STATES } from "./table-view";

describe("getTableView", () => {
  it("shows the order summary while the table has orders", () => {
    expect(getTableView({ orders: SEED_ORDERS }, null)).toBe("open");
  });

  it("shows the empty state when the table has no orders", () => {
    expect(getTableView({ orders: [] }, null)).toBe("empty");
  });

  it("lets a forced state override the orders", () => {
    expect(getTableView({ orders: SEED_ORDERS }, "error")).toBe("error");
    expect(getTableView({ orders: SEED_ORDERS }, "empty")).toBe("empty");
  });

  it("only accepts the empty and error forced states", () => {
    expect(TABLE_FORCED_STATES).toEqual(["empty", "error"]);
  });
});
