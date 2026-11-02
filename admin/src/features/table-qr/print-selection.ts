import { formatCardTitle } from "./print-card";
import { buildTableQrUrl } from "./qr-url";
import type { TableQr } from "./table-qr-types";
import type { SpaceFilter } from "./table-qr-view";

export type PrintSizeId = "a6" | "compact";

export type PrintSize = { id: PrintSizeId; label: string; perSheet: number };

/**
 * "Tamaño": A6 cards (four per A4 sheet) or compact cards (six per A4 sheet, "Hoja A4 ·
 * 6 tarjetas").
 */
export const PRINT_SIZES: readonly PrintSize[] = [
  { id: "a6", label: "A6", perSheet: 4 },
  { id: "compact", label: "Compacta", perSheet: 6 },
];

export function getPrintSize(id: PrintSizeId): PrintSize {
  return PRINT_SIZES.find((size) => size.id === id) ?? PRINT_SIZES[0];
}

/** "Solo se incluyen credenciales QR activas": enabled tables with a QR, by number. */
export function getPrintableTables(tables: readonly TableQr[]): TableQr[] {
  return tables.filter((table) => table.enabled && table.qr).sort((a, b) => a.number - b.number);
}

export function filterBySpace(tables: readonly TableQr[], spaceId: SpaceFilter): TableQr[] {
  return spaceId === "all" ? [...tables] : tables.filter((table) => table.spaceId === spaceId);
}

/** Choosing a space selects every printable table of it. */
export function selectSpace(printable: readonly TableQr[], spaceId: SpaceFilter): string[] {
  return filterBySpace(printable, spaceId).map((table) => table.id);
}

export function toggleSelection(selection: readonly string[], id: string): string[] {
  return selection.includes(id) ? selection.filter((item) => item !== id) : [...selection, id];
}

/** "Seleccionar todos": selects the visible tables, or clears them when all already are. */
export function toggleAll(visible: readonly TableQr[], selection: readonly string[]): string[] {
  if (visible.length === 0) return [...selection];
  const visibleIds = visible.map((table) => table.id);
  if (visibleIds.every((id) => selection.includes(id))) return selection.filter((id) => !visibleIds.includes(id));
  return [...selection, ...visibleIds.filter((id) => !selection.includes(id))];
}

/** Printable tables in the selection, by number; ids no longer eligible are ignored. */
export function getSelectedTables(printable: readonly TableQr[], selection: readonly string[]): TableQr[] {
  return printable.filter((table) => selection.includes(table.id));
}

/** Splits cards into A4 sheets. */
export function paginate<T>(items: readonly T[], perSheet: number): T[][] {
  const sheets: T[][] = [];
  for (let index = 0; index < items.length; index += perSheet) sheets.push(items.slice(index, index + perSheet));
  return sheets;
}

export type PrintCard = { tableId: string; label: string; title: string; url: string };

/** The printed card of a table with a credential (callers pass printable tables). */
export function toPrintCard(table: TableQr, baseUrl?: string): PrintCard {
  return {
    tableId: table.id,
    label: table.label,
    title: formatCardTitle(table.label),
    url: buildTableQrUrl({ number: table.number, token: table.qr?.token ?? "" }, baseUrl),
  };
}

/** "Imprimir códigos QR": space filter, card size and the selected table ids. */
export type BulkPrintState = { spaceId: SpaceFilter; size: PrintSizeId; selection: string[] };

/** Opens with every printable table selected, in A6. */
export function openBulkPrint(tables: readonly TableQr[]): BulkPrintState {
  return { spaceId: "all", size: "a6", selection: selectSpace(getPrintableTables(tables), "all") };
}

export function setBulkSpace(state: BulkPrintState, tables: readonly TableQr[], spaceId: SpaceFilter): BulkPrintState {
  return { ...state, spaceId, selection: selectSpace(getPrintableTables(tables), spaceId) };
}

export type BulkRow = { id: string; label: string; selected: boolean };

export type BulkPrintView = {
  /** "12 seleccionados". */
  countLabel: string;
  /** Printable tables of the chosen space. */
  rows: BulkRow[];
  /** Every visible table is selected ("Seleccionar todos" clears them). */
  allSelected: boolean;
  /** Visible printable tables, for "Seleccionar todos". */
  visible: TableQr[];
  perSheet: number;
  /** Selected cards split into A4 sheets. */
  sheets: PrintCard[][];
  /** "Vista previa · A4": the first sheet. */
  preview: PrintCard[];
  canExport: boolean;
};

export function getBulkPrintView(tables: readonly TableQr[], bulk: BulkPrintState): BulkPrintView {
  const printable = getPrintableTables(tables);
  const visible = filterBySpace(printable, bulk.spaceId);
  const selected = getSelectedTables(printable, bulk.selection);
  const { perSheet } = getPrintSize(bulk.size);
  const sheets = paginate(selected.map((table) => toPrintCard(table)), perSheet);
  return {
    countLabel: `${selected.length} ${selected.length === 1 ? "seleccionado" : "seleccionados"}`,
    rows: visible.map((table) => ({
      id: table.id,
      label: table.spaceName ? `${table.label} · ${table.spaceName}` : table.label,
      selected: bulk.selection.includes(table.id),
    })),
    allSelected: visible.length > 0 && visible.every((table) => bulk.selection.includes(table.id)),
    visible,
    perSheet,
    sheets,
    preview: sheets[0] ?? [],
    canExport: selected.length > 0,
  };
}
