import type { CatalogRepository, IdGenerator } from '../domain/catalog-repository.js';
import type { Category } from '../domain/category.js';
import type { Product } from '../domain/product.js';
import { CategoryNotFoundError, ProductNotFoundError } from '../domain/catalog-errors.js';

export interface Clock {
  now(): Date;
}

/** Everything the catalog use cases need, wired by `CatalogModule` or by test fakes. */
export interface CatalogDeps {
  catalog: CatalogRepository;
  ids: IdGenerator;
  clock: Clock;
}

export function findCategory(categories: readonly Category[], id: string): Category {
  const category = categories.find((candidate) => candidate.id === id);
  if (!category) throw new CategoryNotFoundError();
  return category;
}

export async function loadProduct(deps: CatalogDeps, id: string): Promise<Product> {
  const [product] = await deps.catalog.findProducts([id]);
  if (!product) throw new ProductNotFoundError();
  return product;
}
