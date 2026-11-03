"use client";

import { useMenu } from "@/features/menu/MenuProvider";
import { findMenuProduct } from "@/features/menu/menu-mapper";
import { getDefaultChoiceIds } from "@/features/menu/product-pricing";
import { AddButton } from "@/shared/ui";
import { useCart } from "./CartProvider";

type QuickAddButtonProps = {
  productId: string;
  size?: 28 | 30 | 32;
};

/** "+" button that adds one unit of the product's default configuration to the cart. */
export function QuickAddButton({ productId, size }: QuickAddButtonProps) {
  const { addItem } = useCart();
  const product = findMenuProduct(useMenu().menu, productId);
  if (!product) return null;

  return (
    <AddButton
      size={size}
      label={`Agregar ${product.name} al pedido`}
      onClick={() => addItem({ productId, choiceIds: getDefaultChoiceIds(product) })}
    />
  );
}
