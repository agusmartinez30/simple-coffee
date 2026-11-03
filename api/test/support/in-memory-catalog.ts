import type { CatalogDeps } from '../../src/modules/catalog/application/catalog-deps.js';
import type { CatalogRepository, IdGenerator, ProductFilter } from '../../src/modules/catalog/domain/catalog-repository.js';
import type { Category } from '../../src/modules/catalog/domain/category.js';
import type { Product } from '../../src/modules/catalog/domain/product.js';
import { FakeClock } from './in-memory-auth.js';

/** In-memory adapters for the catalog ports, shared by unit specs and the HTTP e2e test. */

export interface CatalogFixture {
  categories: Category[];
  products: Product[];
}

export class InMemoryCatalog implements CatalogRepository {
  categories: Category[] = [];
  products: Product[] = [];

  constructor(fixture?: CatalogFixture) {
    if (fixture) this.reset(fixture);
  }

  reset(fixture: CatalogFixture): void {
    this.categories = structuredClone(fixture.categories);
    this.products = structuredClone(fixture.products);
  }

  listCategories(): Promise<Category[]> {
    return Promise.resolve(structuredClone([...this.categories].sort((a, b) => a.position - b.position)));
  }

  saveCategory(category: Category): Promise<void> {
    const copy = structuredClone(category);
    const index = this.categories.findIndex((candidate) => candidate.id === category.id);
    if (index < 0) this.categories.push(copy);
    else this.categories[index] = copy;
    return Promise.resolve();
  }

  saveCategoryOrder(ids: readonly string[]): Promise<void> {
    for (const category of this.categories) category.position = ids.indexOf(category.id);
    return Promise.resolve();
  }

  deleteCategory(id: string): Promise<void> {
    this.categories = this.categories.filter((category) => category.id !== id);
    return Promise.resolve();
  }

  countProducts(categoryId: string): Promise<number> {
    return Promise.resolve(this.products.filter((product) => product.categoryId === categoryId).length);
  }

  listProducts({ categoryId, includeArchived = false }: ProductFilter = {}): Promise<Product[]> {
    const rank = (product: Product) => this.categories.find((category) => category.id === product.categoryId)?.position ?? 0;
    const products = this.products
      .filter((product) => (categoryId === undefined || product.categoryId === categoryId) && (includeArchived || !product.archived))
      .sort((a, b) => rank(a) - rank(b) || a.position - b.position);
    return Promise.resolve(structuredClone(products));
  }

  findProducts(ids: readonly string[]): Promise<Product[]> {
    return Promise.resolve(structuredClone(this.products.filter((product) => ids.includes(product.id))));
  }

  saveProduct(product: Product): Promise<void> {
    const copy = structuredClone(product);
    const index = this.products.findIndex((candidate) => candidate.id === product.id);
    if (index < 0) this.products.push(copy);
    else this.products[index] = copy;
    return Promise.resolve();
  }
}

/** `id_1`, `id_2`, … */
export class SequenceIdGenerator implements IdGenerator {
  private counter = 0;

  next(): string {
    this.counter += 1;
    return `id_${this.counter}`;
  }
}

const AT = new Date('2026-10-21T12:00:00Z');

function category(id: string, name: string, position: number): Category {
  return { id, name, description: '', visible: true, position, createdAt: AT, updatedAt: AT };
}

function product(id: string, sku: string, name: string, categoryId: string, position: number, overrides: Partial<Product> = {}): Product {
  return {
    id,
    sku,
    name,
    plural: null,
    description: '',
    price: 3500,
    categoryId,
    image: null,
    moments: [],
    publication: 'published',
    available: true,
    archived: false,
    allowCustomerNotes: false,
    position,
    version: 1,
    optionGroups: [],
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

/**
 * Cafés (Latte with a milk group, archived Mocha) and Bebidas (draft Té verde, unavailable
 * Limonada). Bebidas is shown first.
 */
export function catalogFixture(): CatalogFixture {
  return {
    categories: [category('bebidas', 'Bebidas', 0), category('cafes', 'Cafés', 1)],
    products: [
      product('prod_latte', 'CAF-001', 'Latte', 'cafes', 1, {
        price: 4200,
        allowCustomerNotes: true,
        optionGroups: [
          {
            id: 'grp_milk',
            title: 'Leche',
            selection: 'single',
            required: true,
            max: 1,
            defaultOptionId: 'opt_whole',
            options: [
              { id: 'opt_whole', name: 'Entera', priceDelta: 0 },
              { id: 'opt_oat', name: 'Avena', priceDelta: 900 },
            ],
          },
        ],
      }),
      product('prod_mocha', 'CAF-002', 'Mocha', 'cafes', 2, { archived: true }),
      product('prod_tea', 'BEB-001', 'Té verde', 'bebidas', 1, { publication: 'draft' }),
      product('prod_lemonade', 'BEB-002', 'Limonada', 'bebidas', 2, { available: false }),
    ],
  };
}

export function createCatalogDeps(fixture: CatalogFixture = catalogFixture()) {
  return {
    catalog: new InMemoryCatalog(fixture),
    ids: new SequenceIdGenerator(),
    clock: new FakeClock(new Date('2026-11-01T12:00:00Z')),
  } satisfies CatalogDeps;
}
