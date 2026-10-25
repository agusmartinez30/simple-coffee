import { describe, expect, it } from "vitest";
import { SERVICE_DAY, deriveTable } from "@/mocks/service-day";
import { createDraft } from "./order-draft";
import {
  createTablesState,
  getSelectedTableNumber,
  tablesReducer,
  type TablesAction,
  type TablesState,
} from "./tables-state";

const live = SERVICE_DAY.tableNumbers;
const run = (state: TablesState, ...actions: TablesAction[]) => actions.reduce(tablesReducer, state);

describe("tablesReducer", () => {
  it("starts on the board with no panel", () => {
    const state = createTablesState(SERVICE_DAY);
    expect(state).toEqual({ day: SERVICE_DAY, panel: { kind: "none" }, chargeTarget: null });
    expect(getSelectedTableNumber(state)).toBeNull();
  });

  it("opens and closes the quick detail of a table", () => {
    const state = run(createTablesState(SERVICE_DAY), { type: "select-table", tableNumber: 2 });
    expect(state.panel).toEqual({ kind: "detail", tableNumber: 2 });
    expect(getSelectedTableNumber(state)).toBe(2);
    expect(run(state, { type: "close-panel" }).panel).toEqual({ kind: "none" });
  });

  it("starts an order for the selected table or for none, and edits the draft", () => {
    const fromHeader = run(createTablesState(SERVICE_DAY), { type: "start-order", tableNumber: null });
    expect(fromHeader.panel).toEqual({ kind: "order", draft: createDraft(null) });
    expect(getSelectedTableNumber(fromHeader)).toBeNull();

    const state = run(
      fromHeader,
      { type: "draft-table", tableNumber: 2 },
      { type: "draft-add", productId: "cappuccino" },
      { type: "draft-add", productId: "medialuna" },
      { type: "draft-add", productId: "medialuna" },
      { type: "draft-remove", productId: "medialuna" },
      { type: "draft-note", note: "Sin azúcar" },
    );
    expect(state.panel).toEqual({
      kind: "order",
      draft: {
        tableNumber: 2,
        lines: [
          { productId: "cappuccino", quantity: 1 },
          { productId: "medialuna", quantity: 1 },
        ],
        note: "Sin azúcar",
      },
    });
    expect(getSelectedTableNumber(state)).toBe(2);
  });

  it("ignores draft edits while no order is being loaded", () => {
    const state = createTablesState(SERVICE_DAY);
    expect(tablesReducer(state, { type: "draft-add", productId: "cappuccino" })).toBe(state);
  });

  it("assigns the order at the mock clock, updates the table and shows its detail", () => {
    const before = deriveTable(SERVICE_DAY, 1);
    const state = run(
      createTablesState(SERVICE_DAY),
      { type: "start-order", tableNumber: 1 },
      { type: "draft-add", productId: "cappuccino" },
      { type: "assign-order", customer: "Sofía M.", tableNumbers: live },
    );
    expect(before.status).toBe("available");
    expect(deriveTable(state.day, 1)).toMatchObject({ status: "occupied", accountTotal: 4600, confirmedOrders: 1 });
    expect(state.day.orders.at(-1)?.receivedAt).toBe(SERVICE_DAY.now);
    expect(state.panel).toEqual({ kind: "detail", tableNumber: 1 });
  });

  it("assigns to tables configured in this session that the seed day does not list", () => {
    const state = run(
      createTablesState(SERVICE_DAY),
      { type: "start-order", tableNumber: 13 },
      { type: "draft-add", productId: "limonada" },
      { type: "assign-order", customer: "Sofía M.", tableNumbers: [...live, 13] },
    );
    expect(deriveTable(state.day, 13).accountTotal).toBe(3600);
    expect(state.day.tableNumbers).toEqual(SERVICE_DAY.tableNumbers);
  });

  it("does not assign an incomplete draft", () => {
    const state = run(createTablesState(SERVICE_DAY), { type: "start-order", tableNumber: 2 });
    expect(tablesReducer(state, { type: "assign-order", customer: "Sofía M.", tableNumbers: live })).toBe(state);
  });

  it("opens the charge form of a seated table with no method chosen and no tip", () => {
    const detail = run(createTablesState(SERVICE_DAY), { type: "select-table", tableNumber: 10 });
    const asking = run(detail, { type: "request-charge" });
    expect(asking.chargeTarget).toEqual({ tableNumber: 10, method: null, tip: { kind: "none" } });
    expect(run(asking, { type: "dismiss-charge" })).toMatchObject({ chargeTarget: null, day: SERVICE_DAY });
  });

  it("does not charge until a payment method is chosen", () => {
    const asking = run(createTablesState(SERVICE_DAY), { type: "select-table", tableNumber: 10 }, { type: "request-charge" });
    expect(tablesReducer(asking, { type: "confirm-charge", confirmedBy: "Sofía M." })).toBe(asking);
  });

  it("does not charge with an invalid tip amount", () => {
    const asking = run(
      createTablesState(SERVICE_DAY),
      { type: "select-table", tableNumber: 10 },
      { type: "request-charge" },
      { type: "charge-method", method: "cash" },
      { type: "charge-tip", tip: { kind: "amount", text: "mil" } },
    );
    expect(tablesReducer(asking, { type: "confirm-charge", confirmedBy: "Sofía M." })).toBe(asking);
  });

  it("charges with the chosen method and tip, and frees the table", () => {
    const account = deriveTable(SERVICE_DAY, 10).accountTotal;
    const asking = run(
      createTablesState(SERVICE_DAY),
      { type: "select-table", tableNumber: 10 },
      { type: "request-charge" },
      { type: "charge-method", method: "card" },
      { type: "charge-tip", tip: { kind: "percent", value: 10 } },
    );
    expect(asking.chargeTarget).toEqual({ tableNumber: 10, method: "card", tip: { kind: "percent", value: 10 } });

    const charged = run(asking, { type: "confirm-charge", confirmedBy: "Sofía M." });
    expect(deriveTable(charged.day, 10).status).toBe("available");
    expect(charged.day.collections.at(-1)).toMatchObject({
      time: SERVICE_DAY.now,
      confirmedBy: "Sofía M.",
      method: "card",
      tip: Math.round(account * 0.1),
    });
    expect(charged).toMatchObject({ chargeTarget: null, panel: { kind: "none" } });
  });

  it("ignores charge edits while no charge is open", () => {
    const state = createTablesState(SERVICE_DAY);
    expect(tablesReducer(state, { type: "charge-method", method: "cash" })).toBe(state);
    expect(tablesReducer(state, { type: "charge-tip", tip: { kind: "none" } })).toBe(state);
  });

  it("never asks to charge a free table", () => {
    const state = run(createTablesState(SERVICE_DAY), { type: "select-table", tableNumber: 1 });
    expect(tablesReducer(state, { type: "request-charge" })).toBe(state);
  });

  it("builds the forced 02C, 02D and charge variants on Mesa 02", () => {
    expect(createTablesState(SERVICE_DAY, "detail").panel).toEqual({ kind: "detail", tableNumber: 2 });
    expect(createTablesState(SERVICE_DAY, "charge")).toMatchObject({
      panel: { kind: "detail", tableNumber: 2 },
      chargeTarget: { tableNumber: 2, method: null, tip: { kind: "none" } },
    });
    expect(createTablesState(SERVICE_DAY, "load-order").panel).toEqual({
      kind: "order",
      draft: {
        tableNumber: 2,
        lines: [
          { productId: "cappuccino", quantity: 1 },
          { productId: "medialuna", quantity: 1 },
        ],
        note: "",
      },
    });
  });
});
