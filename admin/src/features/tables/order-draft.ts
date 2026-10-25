import type { Product, ProductCategoryId, ServiceDay, VenueTable } from "@/mocks/service-day";
import { formatPrice } from "@/shared/lib/format-price";
import type { DraftLine } from "./table-service";
import { formatTableLabel } from "./tables-view";

/** "Cargar pedido" (02C): the order being loaded to a table, before "Asignar pedido". */
export type OrderDraft = {
  /** Target table; null until one is chosen in "Mesa". */
  tableNumber: number | null;
  /** Products in the order they were first added. */
  lines: DraftLine[];
  /** "Agregar nota para cocina…". */
  note: string;
};

export function createDraft(tableNumber: number | null): OrderDraft {
  return { tableNumber, lines: [], note: "" };
}

export function addProduct(draft: OrderDraft, productId: string): OrderDraft {
  const exists = draft.lines.some((line) => line.productId === productId);
  return {
    ...draft,
    lines: exists
      ? draft.lines.map((line) => (line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line))
      : [...draft.lines, { productId, quantity: 1 }],
  };
}

/** Removes one unit; the line leaves the order at zero. */
export function removeProduct(draft: OrderDraft, productId: string): OrderDraft {
  if (!draft.lines.some((line) => line.productId === productId)) return draft;
  return {
    ...draft,
    lines: draft.lines
      .map((line) => (line.productId === productId ? { ...line, quantity: line.quantity - 1 } : line))
      .filter((line) => line.quantity > 0),
  };
}

export function setDraftTable(draft: OrderDraft, tableNumber: number | null): OrderDraft {
  return { ...draft, tableNumber };
}

export function setDraftNote(draft: OrderDraft, note: string): OrderDraft {
  return { ...draft, note };
}

export type DraftLineView = { productId: string; quantityLabel: string; name: string; subtotal: string };

export type DraftSummary = {
  lines: DraftLineView[];
  /** "2 ítems": units in the order. */
  itemCount: string;
  total: number;
  totalLabel: string;
};

/** "Pedido actual": one line per product with its subtotal, the item count and the total. */
export function getDraftSummary(draft: OrderDraft, products: readonly Product[]): DraftSummary {
  const lines: (DraftLineView & { amount: number; quantity: number })[] = [];
  for (const line of draft.lines) {
    const product = products.find((candidate) => candidate.id === line.productId);
    if (!product) continue;
    const amount = product.price * line.quantity;
    lines.push({
      productId: product.id,
      quantityLabel: `${line.quantity}×`,
      name: line.quantity > 1 && product.plural ? product.plural : product.name,
      subtotal: formatPrice(amount),
      amount,
      quantity: line.quantity,
    });
  }
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return {
    lines: lines.map(({ productId, quantityLabel, name, subtotal }) => ({ productId, quantityLabel, name, subtotal })),
    itemCount: `${units} ${units === 1 ? "ítem" : "ítems"}`,
    total,
    totalLabel: formatPrice(total),
  };
}

export function canAssignDraft(draft: OrderDraft): boolean {
  return draft.tableNumber !== null && draft.lines.length > 0;
}

/** Primary action: "Asignar pedido a Mesa 02", or a prompt while no table is chosen. */
export function getAssignLabel(draft: OrderDraft): string {
  return draft.tableNumber === null ? "Elegí una mesa" : `Asignar pedido a ${formatTableLabel(draft.tableNumber)}`;
}

export type ProductShortcut = "frequent" | "coffee" | "food" | "extras";

/** "Categorías rápidas": today's best sellers and three groups of the 07 categories. */
export const PRODUCT_SHORTCUTS: readonly { id: ProductShortcut; label: string }[] = [
  { id: "frequent", label: "Frecuentes" },
  { id: "coffee", label: "Cafés" },
  { id: "food", label: "Comidas" },
  { id: "extras", label: "Extras" },
];

const SHORTCUT_CATEGORIES: Record<Exclude<ProductShortcut, "frequent">, readonly ProductCategoryId[]> = {
  coffee: ["cafes"],
  food: ["tostadas", "tostados", "sandwiches", "hamburguesas"],
  extras: ["panaderia", "postres", "bebidas", "licuados"],
};

/** How many best sellers "Frecuentes" shows. */
const FREQUENT_LIMIT = 4;

export type QuickProduct = { id: string; name: string; price: string };

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

function isOrderable(product: Product): boolean {
  return product.publication === "published" && product.available && !product.archived;
}

function getSoldToday(day: ServiceDay): Map<string, number> {
  const today = new Set(day.sessions.filter((session) => session.date === day.date).map((session) => session.id));
  const sold = new Map<string, number>();
  for (const order of day.orders) {
    if (!today.has(order.sessionId) || order.status === "cancelled") continue;
    for (const item of order.items) sold.set(item.productId, (sold.get(item.productId) ?? 0) + item.quantity);
  }
  return sold;
}

/**
 * Products of "Agregar productos": a search covers the whole orderable menu ("Buscar café, comida
 * o extra…"); otherwise the active shortcut applies. "Frecuentes" ranks today's sales.
 */
export function getQuickProducts(
  day: ServiceDay,
  { shortcut, query }: { shortcut: ProductShortcut; query: string },
): QuickProduct[] {
  const orderable = day.products.filter(isOrderable);
  const search = normalize(query);
  let products: Product[];
  if (search !== "") {
    products = orderable.filter((product) => normalize(product.name).includes(search));
  } else if (shortcut === "frequent") {
    const sold = getSoldToday(day);
    products = orderable
      .filter((product) => (sold.get(product.id) ?? 0) > 0)
      .sort((a, b) => (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0))
      .slice(0, FREQUENT_LIMIT);
  } else {
    const categories = SHORTCUT_CATEGORIES[shortcut];
    products = orderable.filter((product) => categories.includes(product.categoryId));
  }
  return products.map((product) => ({ id: product.id, name: product.name, price: formatPrice(product.price) }));
}

export type TableOption = { number: number; label: string };

/** "Mesa" selector: every enabled table, "Mesa 02 · 4 personas". */
export function getTableOptions(config: readonly VenueTable[]): TableOption[] {
  return config
    .filter((table) => table.enabled)
    .sort((a, b) => a.number - b.number)
    .map((table) => ({
      number: table.number,
      label: `${formatTableLabel(table.number)} · ${table.capacity} ${table.capacity === 1 ? "persona" : "personas"}`,
    }));
}
