import type { CartLine } from "@/features/cart";
import { describeChoices, getProductById, getUnitPrice } from "@/mocks/menu";
import type { Ars } from "@/mocks/types";
import { formatPrice } from "@/shared/lib/format-price";

export type CartLineView = {
  line: CartLine;
  name: string;
  image: string;
  unitPrice: Ars;
  lineTotal: Ars;
  /** Row text: chosen options, or "2 unidades · $3.800 c/u" for plain lines. */
  details: string;
  note?: string;
};

export function formatUnits(quantity: number): string {
  return `${quantity} ${quantity === 1 ? "unidad" : "unidades"}`;
}

/** Display data for a cart line, priced from the menu; null when the product is gone. */
export function getCartLineView(line: CartLine): CartLineView | null {
  const product = getProductById(line.productId);
  if (!product) return null;
  const unitPrice = getUnitPrice(product, line.choiceIds);
  const choices = describeChoices(product, line.choiceIds);
  return {
    line,
    name: product.name,
    image: product.image,
    unitPrice,
    lineTotal: unitPrice * line.quantity,
    details: choices || `${formatUnits(line.quantity)} · ${formatPrice(unitPrice)} c/u`,
    note: line.note,
  };
}
