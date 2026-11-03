import { orderBlock, type Product, type ProductMoment, type ProductOptionGroup } from '../domain/product.js';
import type { CatalogDeps } from './catalog-deps.js';

/** Customer-facing read model of the catalog (web menu, explore and product detail). */

export interface MenuCategory {
  id: string;
  name: string;
  description: string;
}

export interface MenuProduct {
  id: string;
  name: string;
  plural: string | null;
  description: string;
  price: number;
  categoryId: string;
  image: string | null;
  moments: ProductMoment[];
  allowCustomerNotes: boolean;
  optionGroups: ProductOptionGroup[];
}

export interface Menu {
  categories: MenuCategory[];
  products: MenuProduct[];
}

function toMenuProduct(product: Product): MenuProduct {
  return {
    id: product.id,
    name: product.name,
    plural: product.plural,
    description: product.description,
    price: product.price,
    categoryId: product.categoryId,
    image: product.image,
    moments: product.moments,
    allowCustomerNotes: product.allowCustomerNotes,
    optionGroups: product.optionGroups.map((group) => ({
      id: group.id,
      title: group.title,
      selection: group.selection,
      required: group.required,
      max: group.max,
      defaultOptionId: group.defaultOptionId,
      options: group.options.map((option) => ({ id: option.id, name: option.name, priceDelta: option.priceDelta })),
    })),
  };
}

/**
 * The menu customers see, without a session: visible categories by position and the products
 * they can order (published, available, not archived) of those categories, by category position
 * then product position. Unavailable products are left out because the customer app has no
 * "sold out" state. Staff-only fields (sku, version, publication, archived, dates) are not exposed.
 */
export class GetMenu {
  constructor(private readonly deps: CatalogDeps) {}

  async execute(): Promise<Menu> {
    const [categories, products] = await Promise.all([this.deps.catalog.listCategories(), this.deps.catalog.listProducts()]);
    const visible = categories.filter((category) => category.visible);
    const visibleIds = new Set(visible.map((category) => category.id));
    return {
      categories: visible.map(({ id, name, description }) => ({ id, name, description })),
      products: products.filter((product) => visibleIds.has(product.categoryId) && orderBlock(product) === null).map(toMenuProduct),
    };
  }
}
