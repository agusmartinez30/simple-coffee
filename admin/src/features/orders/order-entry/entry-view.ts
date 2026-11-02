import { formatPrice } from "@/shared/lib/format-price";
import { formatTableLabel } from "../orders-view";
import type { EntryProduct, EntryTable } from "./entry-types";

/** Pure view helpers of "Nuevo pedido". */

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/** Products of the chosen category (all when null) whose name contains the query, ignoring case and accents. */
export function filterEntryProducts(
  products: readonly EntryProduct[],
  { query, categoryId }: { query: string; categoryId: string | null },
): EntryProduct[] {
  const needle = normalize(query);
  return products.filter(
    (product) => (categoryId === null || product.categoryId === categoryId) && (needle === "" || normalize(product.name).includes(needle)),
  );
}

/** "Mesa 02 · 4 personas"; a custom label shows after the number ("Mesa 03 · Ventana · 4 personas"). */
export function describeTable(table: EntryTable): string {
  const number = formatTableLabel(table.number);
  const label = table.label.trim();
  const people = `${table.capacity} ${table.capacity === 1 ? "persona" : "personas"}`;
  return [number, label !== "" && label !== number ? label : null, people].filter(Boolean).join(" · ");
}

export function formatItemCount(count: number): string {
  if (count === 0) return "Sin ítems";
  return `${count} ${count === 1 ? "ítem" : "ítems"}`;
}

export function formatOptionDelta(delta: number): string {
  return delta === 0 ? "Sin cargo" : `+${formatPrice(delta)}`;
}

export function submitLabel(tableNumber: number | null): string {
  return tableNumber === null ? "Asignar pedido" : `Asignar pedido a ${formatTableLabel(tableNumber)}`;
}
