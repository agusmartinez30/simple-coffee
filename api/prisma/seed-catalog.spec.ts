import { describe, expect, it } from 'vitest';
import { seedCatalogIssues, seedCategories, seedProducts } from './seed-catalog.js';

describe('seed catalog', () => {
  const categories = seedCategories();
  const products = seedProducts();

  it('describes the admin mock menu', () => {
    expect(categories.map((category) => category.id)).toEqual([
      'cafes',
      'tostadas',
      'panaderia',
      'postres',
      'tostados',
      'sandwiches',
      'hamburguesas',
      'bebidas',
      'licuados',
    ]);
    expect(categories.map((category) => category.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(products).toHaveLength(13);
    expect(products.flatMap((product) => product.optionGroups)).toHaveLength(4);
    expect(products.flatMap((product) => product.optionGroups.flatMap((group) => group.options))).toHaveLength(9);
  });

  it('passes the domain rules', () => {
    expect(seedCatalogIssues(categories, products)).toEqual([]);
  });

  it('puts every product in an existing category with unique ids and skus', () => {
    const categoryIds = new Set(categories.map((category) => category.id));
    expect(products.every((product) => categoryIds.has(product.categoryId))).toBe(true);
    expect(new Set(products.map((product) => product.id)).size).toBe(products.length);
    expect(new Set(products.map((product) => product.sku)).size).toBe(products.length);
  });

  it('ranks products within their category from 1', () => {
    for (const categoryId of categoryIds(products)) {
      const positions = products.filter((product) => product.categoryId === categoryId).map((product) => product.position);
      expect(positions.toSorted((a, b) => a - b)).toEqual(positions.map((_, index) => index + 1));
    }
    const bebidas = products.filter((product) => product.categoryId === 'bebidas');
    expect(bebidas.map((product) => [product.id, product.position])).toEqual([
      ['prd_jugo-naranja', 1],
      ['prd_limonada', 2],
    ]);
  });

  it('keeps the Cappuccino groups and the mock flags', () => {
    const cappuccino = products.find((product) => product.id === 'prd_cappuccino');
    expect(cappuccino?.optionGroups.map((group) => [group.title, group.selection, group.max, group.defaultOptionId])).toEqual([
      ['Tamaño', 'single', 1, 'opt_cappuccino_tamano_mediano'],
      ['Extras', 'multiple', 2, null],
    ]);
    expect(products.find((product) => product.id === 'prd_hamburguesa-clasica')?.available).toBe(false);
    expect(products.find((product) => product.id === 'prd_cheesecake')?.publication).toBe('draft');
  });

  it('reports invalid sample data', () => {
    const [first, second] = products;
    if (!first || !second) throw new Error('missing products');
    const broken = [first, { ...second, sku: first.sku, categoryId: 'nope' }];
    expect(seedCatalogIssues(categories, broken)).not.toEqual([]);
  });
});

function categoryIds(products: { categoryId: string }[]): Set<string> {
  return new Set(products.map((product) => product.categoryId));
}
