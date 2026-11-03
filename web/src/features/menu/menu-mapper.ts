import type { Category, Menu, MomentId, OptionGroup, Product } from "@/mocks/types";
import type { ApiMenu, ApiMenuOptionGroup, ApiMenuProduct } from "./menu-api";

/** API moment ids (the admin ones) → the web moment ids of `/explore/[moment]`. */
const MOMENT_IDS: Record<string, MomentId> = {
  desayunar: "para-desayunar",
  merendar: "para-merendar",
  cenar: "para-cenar",
  tomar: "para-tomar",
};

function emptyMoments(): Record<MomentId, string[]> {
  return { "para-desayunar": [], "para-merendar": [], "para-cenar": [], "para-tomar": [] };
}

/** A menu without products: what lookups see while the menu loads or after it failed. */
export const EMPTY_MENU: Menu = { categories: [], products: [], momentProductIds: emptyMoments() };

/**
 * Only local public paths ("/images/products/…") are rendered: `next/image` rejects
 * unconfigured remote hosts, and `blob:` URLs only exist in the admin browser that made them.
 */
function toImage(image: string | null): string | undefined {
  const value = image?.trim();
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

function toOptionGroup(group: ApiMenuOptionGroup): OptionGroup {
  return {
    id: group.id,
    // The API has one title per group; it is both the summary name and the heading.
    name: group.title,
    title: group.title,
    required: group.required,
    selection: group.selection,
    ...(group.defaultOptionId ? { defaultChoiceId: group.defaultOptionId } : {}),
    priceDisplay: "delta",
    choices: group.options.map((option) => ({
      id: option.id,
      label: option.name,
      priceDelta: option.priceDelta,
    })),
  };
}

function toProduct(product: ApiMenuProduct): Product {
  const image = toImage(product.image);
  return {
    id: product.id,
    slug: product.id,
    name: product.name,
    ...(product.plural ? { plural: product.plural } : {}),
    description: product.description,
    price: product.price,
    category: product.categoryId,
    ...(image ? { image } : {}),
    allowCustomerNotes: product.allowCustomerNotes,
    ...(product.optionGroups.length > 0 ? { optionGroups: product.optionGroups.map(toOptionGroup) } : {}),
  };
}

/** Maps `GET /catalog/menu` to the web menu; categories without products are hidden. */
export function toMenu(api: ApiMenu): Menu {
  const products = api.products.map(toProduct);
  const used = new Set(products.map((product) => product.category));
  const categories: Category[] = api.categories
    .filter((category) => used.has(category.id))
    .map((category) => ({ id: category.id, label: category.name }));

  const momentProductIds = emptyMoments();
  for (const product of api.products) {
    for (const moment of product.moments) {
      const id = MOMENT_IDS[moment];
      if (id && !momentProductIds[id].includes(product.id)) momentProductIds[id].push(product.id);
    }
  }
  return { categories, products, momentProductIds };
}

export function findMenuProduct(menu: Menu, id: string): Product | undefined {
  return menu.products.find((product) => product.id === id);
}

export function findMenuCategory(menu: Menu, id: string): Category | undefined {
  return menu.categories.find((category) => category.id === id);
}
