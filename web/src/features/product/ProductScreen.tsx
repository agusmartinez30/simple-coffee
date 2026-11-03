"use client";

import { MenuGate, MenuItemUnavailable } from "@/features/menu/MenuGate";
import { useMenu } from "@/features/menu/MenuProvider";
import { findMenuProduct } from "@/features/menu/menu-mapper";
import { ProductDetail } from "./ProductDetail";

function ProductFromMenu({ productId }: { productId: string }) {
  const product = findMenuProduct(useMenu().menu, productId);
  if (!product) return <MenuItemUnavailable title="Este producto no está disponible" />;
  // Keyed so another product starts with its own selection, note and quantity.
  return <ProductDetail key={product.id} product={product} />;
}

/** Screen 03 for a product id of the URL, once the menu is loaded. */
export function ProductScreen({ productId }: { productId: string }) {
  return (
    <MenuGate screen>
      <ProductFromMenu productId={productId} />
    </MenuGate>
  );
}
