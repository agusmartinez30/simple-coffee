import type { Category } from './category.js';
import type { Product } from './product.js';

export interface ProductFilter {
  categoryId?: string;
  /** Archived products are left out unless asked for. */
  includeArchived?: boolean;
}

export interface CatalogRepository {
  /** Categories by position. */
  listCategories(): Promise<Category[]>;
  /** Creates or updates the category, position included. */
  saveCategory(category: Category): Promise<void>;
  /** Sets each category's position to its index in `ids`. */
  saveCategoryOrder(ids: readonly string[]): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  /** Products of the category, archived ones included. */
  countProducts(categoryId: string): Promise<number>;
  /** Products by category position, then by their own position. */
  listProducts(filter?: ProductFilter): Promise<Product[]>;
  /** The products found among `ids`, archived ones included, in no particular order. */
  findProducts(ids: readonly string[]): Promise<Product[]>;
  /** Creates or updates the product; its option groups and options are replaced as a whole. */
  saveProduct(product: Product): Promise<void>;
}

/** Ids for new products, option groups and options. */
export interface IdGenerator {
  next(): string;
}
