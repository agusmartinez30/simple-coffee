import { describe, expect, it } from "vitest";
import type { ManagedTable } from "@/mocks/types";
import { TABLES_BOARD } from "@/mocks/service-day";
import {
  TABLE_FILTERS,
  countTablesByFilter,
  filterTables,
  formatAccountTotal,
  formatOrderCount,
  formatRealtimeLabel,
  formatTableLabel,
  getCardAlert,
  getPaymentPreferenceLabel,
  getStatusBadge,
  getSummaryMetrics,
  getTableActivity,
} from "./tables-view";

const table = (overrides: Partial<ManagedTable> & Pick<ManagedTable, "number">): ManagedTable => ({
  id: `table-${overrides.number}`,
  status: "available",
  confirmedOrders: 0,
  pendingKitchenOrders: 0,
  accountTotal: 0,
  ...overrides,
});

const available = table({ number: 1 });
const occupied = table({ number: 2, status: "occupied", confirmedOrders: 2, accountTotal: 16800 });
const preparing = table({
  number: 3,
  status: "occupied",
  confirmedOrders: 3,
  pendingKitchenOrders: 2,
  accountTotal: 28400,
});
const billRequested = table({
  number: 5,
  status: "bill-requested",
  confirmedOrders: 3,
  pendingKitchenOrders: 1,
  accountTotal: 21500,
  paymentPreference: "table",
  billRequestedMinutesAgo: 2,
});

describe("getTableActivity", () => {
  it("splits occupied tables by pending kitchen orders", () => {
    expect(getTableActivity(available)).toBe("available");
    expect(getTableActivity(occupied)).toBe("occupied");
    expect(getTableActivity(preparing)).toBe("preparing");
  });

  it("gives the bill request priority over the kitchen", () => {
    expect(getTableActivity(billRequested)).toBe("bill-requested");
  });
});

describe("getSummaryMetrics", () => {
  it("counts each activity once, in the order of the design", () => {
    expect(getSummaryMetrics([available, occupied, preparing, billRequested, available])).toEqual([
      { id: "available", label: "Disponibles", value: 2, tone: "success" },
      { id: "occupied", label: "Ocupadas", value: 1, tone: "brand" },
      { id: "preparing", label: "En preparación", value: 1, tone: "warning" },
      { id: "bill-requested", label: "Solicitan cuenta", value: 1, tone: "danger" },
    ]);
  });
});

describe("status chips", () => {
  it("lists the filters of the design", () => {
    expect(TABLE_FILTERS.map((filter) => filter.label)).toEqual([
      "Todas",
      "Disponibles",
      "Ocupadas",
      "Preparación",
      "Cuenta solicitada",
    ]);
  });

  it("counts the tables behind every chip", () => {
    expect(countTablesByFilter([available, occupied, preparing, billRequested])).toEqual({
      all: 4,
      available: 1,
      occupied: 1,
      preparing: 1,
      "bill-requested": 1,
    });
  });
});

describe("filterTables", () => {
  const tables = [available, occupied, preparing, billRequested, table({ number: 10 }), table({ number: 12 })];
  const numbers = (result: ManagedTable[]) => result.map((item) => item.number);

  it("returns every table for the default filter and an empty query", () => {
    expect(numbers(filterTables(tables, { filter: "all", query: "  " }))).toEqual([1, 2, 3, 5, 10, 12]);
  });

  it("filters by activity", () => {
    expect(numbers(filterTables(tables, { filter: "available", query: "" }))).toEqual([1, 10, 12]);
    expect(numbers(filterTables(tables, { filter: "preparing", query: "" }))).toEqual([3]);
    expect(numbers(filterTables(tables, { filter: "bill-requested", query: "" }))).toEqual([5]);
  });

  it("searches the table label, case-insensitively", () => {
    expect(numbers(filterTables(tables, { filter: "all", query: "Mesa 05" }))).toEqual([5]);
    expect(numbers(filterTables(tables, { filter: "all", query: "1" }))).toEqual([1, 10, 12]);
  });

  it("matches unpadded table numbers", () => {
    expect(numbers(filterTables(tables, { filter: "all", query: "mesa 5" }))).toEqual([5]);
    expect(numbers(filterTables(tables, { filter: "all", query: "3" }))).toEqual([3]);
  });

  it("combines the filter and the query", () => {
    expect(numbers(filterTables(tables, { filter: "available", query: "12" }))).toEqual([12]);
    expect(filterTables(tables, { filter: "occupied", query: "12" })).toEqual([]);
  });
});

describe("card copy", () => {
  it("pads the table number", () => {
    expect(formatTableLabel(5)).toBe("Mesa 05");
    expect(formatTableLabel(12)).toBe("Mesa 12");
  });

  it("describes the order count", () => {
    expect(formatOrderCount(available)).toBe("Lista para asignar");
    expect(formatOrderCount({ ...occupied, confirmedOrders: 1 })).toBe("1 pedido");
    expect(formatOrderCount(occupied)).toBe("2 pedidos");
  });

  it("shows a dash instead of a total for available tables", () => {
    expect(formatAccountTotal(available)).toBe("—");
    expect(formatAccountTotal(occupied)).toBe("$16.800");
  });

  it("maps statuses to badges", () => {
    expect(getStatusBadge(available)).toEqual({ label: "Disponible", tone: "success" });
    expect(getStatusBadge(preparing)).toEqual({ label: "Ocupada", tone: "brand" });
    expect(getStatusBadge(billRequested)).toEqual({ label: "Cuenta solicitada", tone: "danger" });
  });

  it("alerts about kitchen orders only on occupied tables", () => {
    expect(getCardAlert(preparing)).toBe("2 en preparación");
    expect(getCardAlert({ ...preparing, pendingKitchenOrders: 1 })).toBe("En preparación");
    expect(getCardAlert(occupied)).toBeNull();
    expect(getCardAlert(billRequested)).toBeNull();
  });

  it("labels the payment preference of a bill request", () => {
    expect(getPaymentPreferenceLabel(billRequested)).toBe("En mesa");
    expect(getPaymentPreferenceLabel({ ...billRequested, paymentPreference: "register" })).toBe("En caja");
    expect(getPaymentPreferenceLabel({ ...billRequested, paymentPreference: "transfer" })).toBe(
      "Transferencia",
    );
    expect(getPaymentPreferenceLabel(occupied)).toBeNull();
  });

  it("formats the realtime pill", () => {
    expect(formatRealtimeLabel("10:42:18")).toBe("En vivo · 10:42:18");
  });
});

/** Agreement with 03, 04 and 10A lives in `src/mocks/service-day/service-day.test.ts`. */
describe("the 02 board of the service day", () => {
  const { tables } = TABLES_BOARD;

  it("holds the twelve tables of the design", () => {
    expect(tables.map((item) => formatTableLabel(item.number))).toEqual(
      Array.from({ length: 12 }, (_, index) => formatTableLabel(index + 1)),
    );
  });

  it("derives the summary metrics, which add up to every table", () => {
    expect(getSummaryMetrics(tables).map((metric) => [metric.label, metric.value])).toEqual([
      ["Disponibles", 2],
      ["Ocupadas", 2],
      ["En preparación", 3],
      ["Solicitan cuenta", 5],
    ]);
  });

  it("derives the cards from each table's orders and bill request", () => {
    expect(
      tables.map((item) => [
        formatTableLabel(item.number),
        getStatusBadge(item).label,
        formatOrderCount(item),
        formatAccountTotal(item),
        getCardAlert(item) ?? getPaymentPreferenceLabel(item),
      ]),
    ).toEqual([
      ["Mesa 01", "Disponible", "Lista para asignar", "—", null],
      ["Mesa 02", "Ocupada", "2 pedidos", "$16.800", "En preparación"],
      ["Mesa 03", "Ocupada", "3 pedidos", "$28.400", "En preparación"],
      ["Mesa 04", "Cuenta solicitada", "2 pedidos", "$14.200", "En mesa"],
      ["Mesa 05", "Cuenta solicitada", "3 pedidos", "$21.500", "En mesa"],
      ["Mesa 06", "Ocupada", "1 pedido", "$8.900", null],
      ["Mesa 07", "Cuenta solicitada", "2 pedidos", "$19.900", "En caja"],
      ["Mesa 08", "Ocupada", "4 pedidos", "$36.700", "En preparación"],
      ["Mesa 09", "Disponible", "Lista para asignar", "—", null],
      ["Mesa 10", "Cuenta solicitada", "3 pedidos", "$31.200", "Transferencia"],
      ["Mesa 11", "Ocupada", "2 pedidos", "$14.300", null],
      ["Mesa 12", "Cuenta solicitada", "3 pedidos", "$27.600", "Transferencia"],
    ]);
  });

  it("shows the sync time of the service day in the realtime pill", () => {
    expect(formatRealtimeLabel(TABLES_BOARD.syncedAt)).toBe("En vivo · 14:42:18");
  });
});
