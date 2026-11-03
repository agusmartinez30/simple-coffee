import type { ProductFilter } from '../domain/catalog-repository.js';
import { InvalidProductError, ProductArchivedError } from '../domain/catalog-errors.js';
import {
  assembleProduct,
  createProductSku,
  normalizeProductDraft,
  productDraftIssues,
  toProductDraft,
  type Product,
  type ProductDraft,
} from '../domain/product.js';
import { loadProduct, type CatalogDeps } from './catalog-deps.js';

export class ListProducts {
  constructor(private readonly deps: CatalogDeps) {}

  execute(filter: ProductFilter = {}): Promise<Product[]> {
    return this.deps.catalog.listProducts(filter);
  }
}

export class GetProduct {
  constructor(private readonly deps: CatalogDeps) {}

  execute(id: string): Promise<Product> {
    return loadProduct(this.deps, id);
  }
}

/** Validates the draft against the categories and every other product; the normalized draft. */
async function validDraft(deps: CatalogDeps, input: ProductDraft, current: Product | null): Promise<ProductDraft> {
  const [categories, products] = await Promise.all([deps.catalog.listCategories(), deps.catalog.listProducts({ includeArchived: true })]);
  const others = products.filter((product) => product.id !== current?.id);
  const issues = productDraftIssues(input, { categoryIds: categories.map((category) => category.id), others, current });
  if (issues.length > 0) throw new InvalidProductError(issues);
  return normalizeProductDraft(input);
}

/** Position after the last product of the category, archived ones included. */
async function nextPosition(deps: CatalogDeps, categoryId: string): Promise<number> {
  const products = await deps.catalog.listProducts({ categoryId, includeArchived: true });
  return Math.max(0, ...products.map((product) => product.position)) + 1;
}

export type NewProduct = Pick<ProductDraft, 'name' | 'price' | 'categoryId'> & Partial<ProductDraft>;

/**
 * Adds a product at the end of its category, as a draft unless told otherwise, with no moments,
 * plural or image unless given; the sku is generated when not given.
 */
export class CreateProduct {
  constructor(private readonly deps: CatalogDeps) {}

  async execute(input: NewProduct): Promise<Product> {
    const draft = await validDraft(
      this.deps,
      {
        description: '',
        plural: null,
        image: null,
        moments: [],
        publication: 'draft',
        available: true,
        allowCustomerNotes: false,
        optionGroups: [],
        ...input,
      },
      null,
    );
    const skus = (await this.deps.catalog.listProducts({ includeArchived: true })).map((product) => product.sku);
    const now = this.deps.clock.now();
    const product = assembleProduct(
      draft,
      {
        id: this.deps.ids.next(),
        sku: draft.sku ?? createProductSku(draft.categoryId, skus),
        archived: false,
        position: await nextPosition(this.deps, draft.categoryId),
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      () => this.deps.ids.next(),
    );
    await this.deps.catalog.saveProduct(product);
    return product;
  }
}

/**
 * Saves the given fields of a product that is not archived; `optionGroups`, when given, replaces
 * every group (ids of kept groups and options are sent back). A new category puts the product at
 * its end. Always bumps the version.
 */
export class UpdateProduct {
  constructor(private readonly deps: CatalogDeps) {}

  async execute(id: string, input: Partial<ProductDraft>): Promise<Product> {
    const current = await loadProduct(this.deps, id);
    if (current.archived) throw new ProductArchivedError();
    const draft = await validDraft(this.deps, { ...toProductDraft(current), ...input }, current);
    const position = draft.categoryId === current.categoryId ? current.position : await nextPosition(this.deps, draft.categoryId);
    const product = assembleProduct(
      draft,
      {
        id,
        sku: draft.sku ?? current.sku,
        archived: false,
        position,
        version: current.version + 1,
        createdAt: current.createdAt,
        updatedAt: this.deps.clock.now(),
      },
      () => this.deps.ids.next(),
    );
    await this.deps.catalog.saveProduct(product);
    return product;
  }
}

/** Takes the product off the menu and the admin list; products are never deleted. Archiving twice changes nothing. */
export class ArchiveProduct {
  constructor(private readonly deps: CatalogDeps) {}

  async execute(id: string): Promise<Product> {
    const current = await loadProduct(this.deps, id);
    if (current.archived) return current;
    const product: Product = { ...current, archived: true, version: current.version + 1, updatedAt: this.deps.clock.now() };
    await this.deps.catalog.saveProduct(product);
    return product;
  }
}

/** Back to the admin list as a draft, so it is not published again by surprise; its name must still be free. */
export class RestoreProduct {
  constructor(private readonly deps: CatalogDeps) {}

  async execute(id: string): Promise<Product> {
    const current = await loadProduct(this.deps, id);
    if (!current.archived) return current;
    const product: Product = { ...current, archived: false, publication: 'draft', version: current.version + 1, updatedAt: this.deps.clock.now() };
    // Another product may have taken the name while this one was archived.
    await validDraft(this.deps, toProductDraft(product), product);
    await this.deps.catalog.saveProduct(product);
    return product;
  }
}
