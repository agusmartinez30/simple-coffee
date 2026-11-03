"use client";

import { MenuGate, MenuItemUnavailable } from "@/features/menu/MenuGate";
import { useMenu } from "@/features/menu/MenuProvider";
import { CategoryResults } from "./CategoryResults";
import { getCategoryById } from "./category-products";

function CategoryFromMenu({ categoryId }: { categoryId: string }) {
  const category = getCategoryById(useMenu().menu, categoryId);
  if (!category) return <MenuItemUnavailable title="Esta categoría no está disponible" />;
  return <CategoryResults category={category} />;
}

/** Products of the URL's category, once the menu is loaded. */
export function CategoryScreen({ categoryId }: { categoryId: string }) {
  return (
    <MenuGate screen>
      <CategoryFromMenu categoryId={categoryId} />
    </MenuGate>
  );
}
