import { describe, expect, it } from 'vitest';
import { catalogFixture, createCatalogDeps } from '../../../../test/support/in-memory-catalog.js';
import type { Category } from '../domain/category.js';
import type { Product } from '../domain/product.js';
import { GetMenu } from './get-menu.js';

/** Default fixture plus a hidden Postres category and two more published Bebidas, stored out of order. */
function menuFixture() {
  const fixture = catalogFixture();
  const latte = fixture.products.find((product) => product.id === 'prod_latte') as Product;
  const like = (overrides: Partial<Product>): Product => ({ ...structuredClone(latte), optionGroups: [], ...overrides });
  const bebidas = fixture.categories.find((category) => category.id === 'bebidas') as Category;
  fixture.categories.push({ ...bebidas, id: 'postres', name: 'Postres', visible: false, position: 2 });
  fixture.products.push(
    like({ id: 'prod_juice', sku: 'BEB-004', name: 'Jugo', categoryId: 'bebidas', position: 4 }),
    like({ id: 'prod_water', sku: 'BEB-003', name: 'Agua', categoryId: 'bebidas', position: 3, moments: ['tomar'], plural: 'Aguas' }),
    like({ id: 'prod_flan', sku: 'POS-001', name: 'Flan', categoryId: 'postres', position: 1 }),
  );
  return fixture;
}

describe('GetMenu', () => {
  it('lists only the visible categories, by position', async () => {
    const menu = await new GetMenu(createCatalogDeps(menuFixture())).execute();
    expect(menu.categories).toEqual([
      { id: 'bebidas', name: 'Bebidas', description: '' },
      { id: 'cafes', name: 'Cafés', description: '' },
    ]);
  });

  it('lists orderable products of visible categories by category position, then product position', async () => {
    const menu = await new GetMenu(createCatalogDeps(menuFixture())).execute();
    // Left out: Té verde (draft), Limonada (unavailable), Mocha (archived), Flan (hidden category).
    expect(menu.products.map((product) => product.id)).toEqual(['prod_water', 'prod_juice', 'prod_latte']);
  });

  it('exposes only customer-safe fields', async () => {
    const menu = await new GetMenu(createCatalogDeps(menuFixture())).execute();
    expect(menu.products[0]).toEqual({
      id: 'prod_water',
      name: 'Agua',
      plural: 'Aguas',
      description: '',
      price: 4200,
      categoryId: 'bebidas',
      image: null,
      moments: ['tomar'],
      allowCustomerNotes: true,
      optionGroups: [],
    });
    expect(menu.products[2]?.optionGroups).toEqual([
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
    ]);
  });
});
