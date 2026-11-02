import { describe, expect, it } from "vitest";
import {
  PRINT_SIZES,
  getBulkPrintView,
  getPrintSize,
  getPrintableTables,
  getSelectedTables,
  openBulkPrint,
  paginate,
  selectSpace,
  setBulkSpace,
  toPrintCard,
  toggleAll,
  toggleSelection,
} from "./print-selection";
import type { TableQr } from "./table-qr-types";

const table = (number: number, spaceId: string, overrides: Partial<TableQr> = {}): TableQr => ({
  id: `tbl_${String(number).padStart(2, "0")}`,
  number,
  label: `Mesa ${String(number).padStart(2, "0")}`,
  spaceId,
  spaceName: spaceId === "salon" ? "Salón" : "Terraza",
  enabled: true,
  qr: { token: `token${number}`, issuedAt: "2026-11-02T13:00:00.000Z", issuedBy: "María G." },
  revoked: [],
  ...overrides,
});

const TABLES = [
  table(1, "salon"),
  table(2, "salon", { qr: null }),
  table(3, "terraza", { enabled: false }),
  table(4, "terraza"),
  table(5, "salon"),
];

describe("getPrintableTables", () => {
  it("only includes enabled tables with an active credential, by number", () => {
    expect(getPrintableTables([...TABLES].reverse()).map((item) => item.number)).toEqual([1, 4, 5]);
  });
});

describe("selection", () => {
  const printable = getPrintableTables(TABLES);

  it("selects a whole space", () => {
    expect(selectSpace(printable, "terraza")).toEqual(["tbl_04"]);
    expect(selectSpace(printable, "all")).toEqual(["tbl_01", "tbl_04", "tbl_05"]);
  });

  it("toggles one table", () => {
    expect(toggleSelection(["tbl_01"], "tbl_04")).toEqual(["tbl_01", "tbl_04"]);
    expect(toggleSelection(["tbl_01", "tbl_04"], "tbl_01")).toEqual(["tbl_04"]);
  });

  it("selects every visible table, or clears them when all are selected", () => {
    const visible = printable.filter((item) => item.spaceId === "salon");
    expect(toggleAll(visible, ["tbl_04"])).toEqual(["tbl_04", "tbl_01", "tbl_05"]);
    expect(toggleAll(visible, ["tbl_04", "tbl_01", "tbl_05"])).toEqual(["tbl_04"]);
    expect(toggleAll([], ["tbl_01"])).toEqual(["tbl_01"]);
  });

  it("prints the selected eligible tables in number order", () => {
    expect(getSelectedTables(printable, ["tbl_05", "tbl_02", "tbl_01"]).map((item) => item.id)).toEqual([
      "tbl_01",
      "tbl_05",
    ]);
  });
});

describe("print sheets", () => {
  it("fits four A6 cards or six compact cards on an A4 sheet", () => {
    expect(PRINT_SIZES.map((size) => [size.id, size.label, size.perSheet])).toEqual([
      ["a6", "A6", 4],
      ["compact", "Compacta", 6],
    ]);
    expect(getPrintSize("compact").perSheet).toBe(6);
  });

  it("splits the cards into sheets", () => {
    expect(paginate([1, 2, 3, 4, 5], 4)).toEqual([[1, 2, 3, 4], [5]]);
    expect(paginate([], 4)).toEqual([]);
  });

  it("builds a card with the table's QR URL", () => {
    expect(toPrintCard(table(7, "salon"), "https://cafe.central")).toEqual({
      tableId: "tbl_07",
      label: "Mesa 07",
      title: "MESA 07",
      url: "https://cafe.central/?mesa=07&qr=token7",
    });
  });
});

describe("bulk print", () => {
  it("opens with every printable table selected, in A6", () => {
    expect(openBulkPrint(TABLES)).toEqual({ spaceId: "all", size: "a6", selection: ["tbl_01", "tbl_04", "tbl_05"] });
  });

  it("choosing a space selects its printable tables", () => {
    expect(setBulkSpace(openBulkPrint(TABLES), TABLES, "salon")).toMatchObject({
      spaceId: "salon",
      selection: ["tbl_01", "tbl_05"],
    });
  });

  it("describes the checklist, count, sheets and preview", () => {
    const view = getBulkPrintView(TABLES, { spaceId: "all", size: "a6", selection: ["tbl_05", "tbl_01"] });
    expect(view.countLabel).toBe("2 seleccionados");
    expect(view.rows).toEqual([
      { id: "tbl_01", label: "Mesa 01 · Salón", selected: true },
      { id: "tbl_04", label: "Mesa 04 · Terraza", selected: false },
      { id: "tbl_05", label: "Mesa 05 · Salón", selected: true },
    ]);
    expect(view.allSelected).toBe(false);
    expect(view.sheets.map((sheet) => sheet.map((card) => card.tableId))).toEqual([["tbl_01", "tbl_05"]]);
    expect(view.preview).toHaveLength(2);
    expect(view.canExport).toBe(true);
  });

  it("cannot export an empty selection", () => {
    const view = getBulkPrintView(TABLES, { spaceId: "all", size: "compact", selection: [] });
    expect(view).toMatchObject({ countLabel: "0 seleccionados", canExport: false, perSheet: 6, preview: [] });
    expect(getBulkPrintView(TABLES, { spaceId: "all", size: "a6", selection: ["tbl_04"] }).countLabel).toBe(
      "1 seleccionado",
    );
  });
});
