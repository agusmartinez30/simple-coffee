import type { Category, Menu, Product } from "@/mocks/types";

/** A menu category by id (only categories with products are on the menu). */
export function getCategoryById(menu: Menu, id: string): Category | undefined {
  return menu.categories.find((category) => category.id === id);
}

/** Every product of a category, in menu order. */
export function getCategoryProducts(menu: Menu, categoryId: Category["id"]): Product[] {
  return menu.products.filter((product) => product.category === categoryId);
}
