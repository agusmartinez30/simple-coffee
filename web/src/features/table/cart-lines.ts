import type { CartLine } from "@/features/cart";
import { findMenuProduct } from "@/features/menu/menu-mapper";
import { describeChoices, getUnitPrice } from "@/features/menu/product-pricing";
import type { Ars, Menu } from "@/mocks/types";
import { formatPrice } from "@/shared/lib/format-price";

export type CartLineView = {
  line: CartLine;
  name: string;
  /** Unset when the product has no photo (placeholder). */
  image?: string;
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
export function getCartLineView(line: CartLine, menu: Menu): CartLineView | null {
  const product = findMenuProduct(menu, line.productId);
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
