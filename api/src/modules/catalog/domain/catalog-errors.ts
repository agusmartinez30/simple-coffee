import type { CategoryIssue } from './category.js';
import type { ProductIssue } from './product.js';

export abstract class CatalogError extends Error {
  abstract readonly code: string;
}

export class CategoryNotFoundError extends CatalogError {
  readonly code = 'category_not_found';
  constructor() {
    super('Category not found');
  }
}

export class ProductNotFoundError extends CatalogError {
  readonly code = 'product_not_found';
  constructor() {
    super('Product not found');
  }
}

export class InvalidCategoryError extends CatalogError {
  readonly code = 'invalid_category';
  constructor(readonly issues: CategoryIssue[]) {
    super('Category does not meet the rules');
  }
}

export class InvalidProductError extends CatalogError {
  readonly code = 'invalid_product';
  constructor(readonly issues: ProductIssue[]) {
    super('Product does not meet the rules');
  }
}

/** Deleting a category that still has products, archived ones included (they keep their category). */
export class CategoryHasProductsError extends CatalogError {
  readonly code = 'category_has_products';
  constructor(readonly productCount: number) {
    super('Move or archive the products of the category first');
  }
}

/** Editing an archived product: it has to be restored first. */
export class ProductArchivedError extends CatalogError {
  readonly code = 'product_archived';
  constructor() {
    super('The product is archived; restore it first');
  }
}
