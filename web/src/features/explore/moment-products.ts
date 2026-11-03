import type { Menu, MomentFilter, MomentId, Product } from "@/mocks/types";

const ALL: MomentFilter = { id: "todos", label: "Todos" };

function momentProducts(menu: Menu, momentId: MomentId): Product[] {
  const ids = menu.momentProductIds[momentId] ?? [];
  return ids.flatMap((id) => menu.products.filter((product) => product.id === id));
}

/**
 * Sub-filter chips of a moment: "Todos", then each menu category that has products in the
 * moment, in menu order. A moment within a single category only offers "Todos".
 */
export function getMomentFilters(menu: Menu, momentId: MomentId): MomentFilter[] {
  const used = new Set(momentProducts(menu, momentId).map((product) => product.category));
  const categories = menu.categories.filter((category) => used.has(category.id));
  return categories.length > 1 ? [ALL, ...categories] : [ALL];
}

/** Products of a moment for the selected sub-filter; "Todos" or an unknown filter shows them all. */
export function getMomentProducts(menu: Menu, momentId: MomentId, filterId: string): Product[] {
  const products = momentProducts(menu, momentId);
  const narrowed = products.filter((product) => product.category === filterId);
  return narrowed.length > 0 ? narrowed : products;
}

/** Sub-filter to open a moment with: a valid `?filter=` value, or the first filter. */
export function resolveFilterId(filters: readonly MomentFilter[], raw: string | string[] | undefined): string {
  const fallback = filters[0]?.id ?? ALL.id;
  if (typeof raw !== "string") return fallback;
  return filters.some((filter) => filter.id === raw) ? raw : fallback;
}
