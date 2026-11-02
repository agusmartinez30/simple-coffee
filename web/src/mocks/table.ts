import { describeChoices, getProductById, getUnitPrice } from "./menu";
import type { Ars, OrderLine, TableInfo, TableOrder } from "./types";

/** The café's static data; the table number comes from the validated QR (`features/table-access`). */
export const TABLE: TableInfo = {
  cafeName: "Café Central",
};

type LineSeed = {
  productId: string;
  quantity: number;
  choiceIds?: string[];
  /** Overrides the customization derived from the chosen options. */
  customization?: string;
  note?: string;
};

/** Builds an order line whose unit price comes from the menu, never hardcoded. */
export function buildOrderLine({
  productId,
  quantity,
  choiceIds = [],
  customization,
  note,
}: LineSeed): OrderLine {
  const product = getProductById(productId);
  if (!product) throw new Error(`Unknown product: ${productId}`);
  const derived = describeChoices(product, choiceIds);
  return {
    productId,
    name: product.shortName ?? product.name,
    quantity,
    unitPrice: getUnitPrice(product, choiceIds),
    customization: customization ?? (derived || undefined),
    note,
  };
}

export function getLineTotal(line: OrderLine): Ars {
  return line.unitPrice * line.quantity;
}

export function getOrderTotal(order: TableOrder): Ars {
  return order.lines.reduce((sum, line) => sum + getLineTotal(line), 0);
}

/** Shared account total: every order of the table counts. */
export function getTableTotal(orders: readonly TableOrder[]): Ars {
  return orders.reduce((sum, order) => sum + getOrderTotal(order), 0);
}

export const SEED_ORDERS: TableOrder[] = [
  {
    id: "order-1042",
    number: "1042",
    customerName: "Agustín",
    time: "11:35",
    lines: [
      buildOrderLine({ productId: "cappuccino", quantity: 1, choiceIds: ["mediano", "almendras"] }),
      buildOrderLine({
        productId: "medialunas",
        quantity: 2,
        customization: "Manteca · Recién horneadas",
      }),
    ],
  },
];
