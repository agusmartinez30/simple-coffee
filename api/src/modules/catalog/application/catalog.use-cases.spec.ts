import { beforeEach, describe, expect, it } from 'vitest';
import { createCatalogDeps } from '../../../../test/support/in-memory-catalog.js';
import {
  CategoryHasProductsError,
  CategoryNotFoundError,
  InvalidCategoryError,
  InvalidProductError,
  ProductArchivedError,
  ProductNotFoundError,
} from '../domain/catalog-errors.js';
import { CreateCategory, DeleteCategory, ListCategories, ReorderCategories, UpdateCategory } from './categories.use-cases.js';
import { ArchiveProduct, CreateProduct, GetProduct, ListProducts, RestoreProduct, UpdateProduct } from './products.use-cases.js';
import { ResolveOrderableProducts } from './resolve-orderable-products.js';

const NOW = new Date('2026-11-01T12:00:00Z');

describe('catalog use cases', () => {
  let deps: ReturnType<typeof createCatalogDeps>;

  beforeEach(() => {
    deps = createCatalogDeps();
  });

  describe('categories', () => {
    it('lists categories by position', async () => {
      expect((await new ListCategories(deps).execute()).map((category) => category.id)).toEqual(['bebidas', 'cafes']);
    });

    it('creates a category at the end with a slug id', async () => {
      const categories = await new CreateCategory(deps).execute({ name: ' Tostadas dulces ' });
      expect(categories.at(-1)).toEqual({
        id: 'tostadas-dulces',
        name: 'Tostadas dulces',
        description: '',
        visible: true,
        position: 2,
        createdAt: NOW,
        updatedAt: NOW,
      });
      await expect(new CreateCategory(deps).execute({ name: 'CAFES' })).rejects.toMatchObject({
        issues: [{ path: 'name', code: 'duplicate' }],
      });
    });

    it('updates the given fields keeping the id', async () => {
      const categories = await new UpdateCategory(deps).execute('cafes', { name: 'Café de especialidad', visible: false });
      expect(categories[1]).toMatchObject({ id: 'cafes', name: 'Café de especialidad', visible: false, position: 1, updatedAt: NOW });
      await expect(new UpdateCategory(deps).execute('cafes', { name: '' })).rejects.toBeInstanceOf(InvalidCategoryError);
      await expect(new UpdateCategory(deps).execute('nope', { name: 'X' })).rejects.toBeInstanceOf(CategoryNotFoundError);
    });

    it('deletes only categories without products, archived ones included', async () => {
      deps.catalog.products = deps.catalog.products.filter((product) => product.id !== 'prod_latte');
      await expect(new DeleteCategory(deps).execute('cafes')).rejects.toEqual(new CategoryHasProductsError(1));
      deps.catalog.products = deps.catalog.products.filter((product) => product.categoryId !== 'cafes');
      expect((await new DeleteCategory(deps).execute('cafes')).map((category) => category.id)).toEqual(['bebidas']);
      await expect(new DeleteCategory(deps).execute('cafes')).rejects.toBeInstanceOf(CategoryNotFoundError);
    });

    it('reorders categories from a full id list', async () => {
      expect((await new ReorderCategories(deps).execute(['cafes', 'bebidas'])).map((category) => category.id)).toEqual(['cafes', 'bebidas']);
      await expect(new ReorderCategories(deps).execute(['cafes'])).rejects.toMatchObject({
        issues: [{ path: 'ids', code: 'not_a_permutation' }],
      });
    });
  });

  describe('products', () => {
    const latte = () => deps.catalog.products.find((product) => product.id === 'prod_latte');

    it('lists products by category order without archived ones unless asked', async () => {
      const ids = async (filter?: Parameters<ListProducts['execute']>[0]) =>
        (await new ListProducts(deps).execute(filter)).map((product) => product.id);
      expect(await ids()).toEqual(['prod_tea', 'prod_lemonade', 'prod_latte']);
      expect(await ids({ categoryId: 'cafes', includeArchived: true })).toEqual(['prod_latte', 'prod_mocha']);
    });

    it('gets a product or fails', async () => {
      expect(await new GetProduct(deps).execute('prod_mocha')).toMatchObject({ archived: true });
      await expect(new GetProduct(deps).execute('nope')).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('creates a draft with the next sku of its category at the end of it', async () => {
      const product = await new CreateProduct(deps).execute({
        name: 'Cortado',
        price: 3000,
        categoryId: 'cafes',
        optionGroups: [
          {
            title: 'Leche',
            selection: 'single',
            required: true,
            defaultOption: 'avena',
            options: [
              { name: 'Entera', priceDelta: 0 },
              { name: 'Avena', priceDelta: 900 },
            ],
          },
        ],
      });
      expect(product).toEqual({
        id: 'id_1',
        sku: 'CAF-003',
        name: 'Cortado',
        plural: null,
        description: '',
        price: 3000,
        categoryId: 'cafes',
        image: null,
        moments: [],
        publication: 'draft',
        available: true,
        archived: false,
        allowCustomerNotes: false,
        position: 3,
        version: 1,
        optionGroups: [
          {
            id: 'id_4',
            title: 'Leche',
            selection: 'single',
            required: true,
            max: 1,
            defaultOptionId: 'id_3',
            options: [
              { id: 'id_2', name: 'Entera', priceDelta: 0 },
              { id: 'id_3', name: 'Avena', priceDelta: 900 },
            ],
          },
        ],
        createdAt: NOW,
        updatedAt: NOW,
      });
      expect(deps.catalog.products).toHaveLength(5);
    });

    it('keeps a given sku and rejects invalid products without saving', async () => {
      expect(await new CreateProduct(deps).execute({ sku: 'esp-100', name: 'Espresso', price: 2500, categoryId: 'cafes' })).toMatchObject({
        sku: 'ESP-100',
      });
      await expect(
        new CreateProduct(deps).execute({ sku: 'CAF-002', name: 'Mocha', price: 0, categoryId: 'nope' }),
      ).rejects.toMatchObject({
        issues: [
          { path: 'sku', code: 'duplicate' },
          { path: 'price', code: 'out_of_range' },
          { path: 'categoryId', code: 'unknown_category' },
        ],
      });
      expect(deps.catalog.products).toHaveLength(5);
    });

    it('updates the given fields, keeping group and option ids and bumping the version', async () => {
      const product = await new UpdateProduct(deps).execute('prod_latte', {
        price: 4500,
        optionGroups: [
          {
            id: 'grp_milk',
            title: 'Leche',
            selection: 'single',
            required: true,
            defaultOption: 'Avena',
            options: [
              { id: 'opt_oat', name: 'Avena', priceDelta: 1000 },
              { name: 'Almendras', priceDelta: 1200 },
            ],
          },
          { title: 'Extras', selection: 'multiple', required: false, max: 2, options: [{ name: 'Canela', priceDelta: 0 }] },
        ],
      });
      expect(product).toMatchObject({ sku: 'CAF-001', price: 4500, version: 2, position: 1, updatedAt: NOW });
      expect(product.optionGroups).toEqual([
        {
          id: 'grp_milk',
          title: 'Leche',
          selection: 'single',
          required: true,
          max: 1,
          defaultOptionId: 'opt_oat',
          options: [
            { id: 'opt_oat', name: 'Avena', priceDelta: 1000 },
            { id: 'id_1', name: 'Almendras', priceDelta: 1200 },
          ],
        },
        { id: 'id_3', title: 'Extras', selection: 'multiple', required: false, max: 2, defaultOptionId: null, options: [{ id: 'id_2', name: 'Canela', priceDelta: 0 }] },
      ]);
    });

    it('keeps the option groups when they are not given and moves to the end of a new category', async () => {
      const product = await new UpdateProduct(deps).execute('prod_latte', { categoryId: 'bebidas' });
      expect(product).toMatchObject({ categoryId: 'bebidas', position: 3, sku: 'CAF-001' });
      expect(product.optionGroups[0]).toMatchObject({ id: 'grp_milk', defaultOptionId: 'opt_whole' });
    });

    it('rejects edits of unknown or archived products and invalid groups', async () => {
      await expect(new UpdateProduct(deps).execute('nope', { price: 1 })).rejects.toBeInstanceOf(ProductNotFoundError);
      await expect(new UpdateProduct(deps).execute('prod_mocha', { price: 1 })).rejects.toBeInstanceOf(ProductArchivedError);
      await expect(
        new UpdateProduct(deps).execute('prod_latte', {
          optionGroups: [{ title: 'Leche', selection: 'single', required: true, max: 3, options: [] }],
        }),
      ).rejects.toBeInstanceOf(InvalidProductError);
      expect(latte()?.version).toBe(1);
    });

    it('archives a product and restores it as a draft', async () => {
      expect(await new ArchiveProduct(deps).execute('prod_latte')).toMatchObject({ archived: true, version: 2 });
      expect(await new ArchiveProduct(deps).execute('prod_latte')).toMatchObject({ version: 2 });
      expect(await new RestoreProduct(deps).execute('prod_latte')).toMatchObject({ archived: false, publication: 'draft', version: 3 });
      expect(await new RestoreProduct(deps).execute('prod_latte')).toMatchObject({ version: 3 });
    });

    it('refuses to restore a product whose name is now taken', async () => {
      await new CreateProduct(deps).execute({ name: 'mocha', price: 3000, categoryId: 'cafes' });
      await expect(new RestoreProduct(deps).execute('prod_mocha')).rejects.toMatchObject({
        issues: [{ path: 'name', code: 'duplicate' }],
      });
    });
  });

  it('resolves products for ordering in the requested order, once each', async () => {
    const resolutions = await new ResolveOrderableProducts(deps).execute(['prod_latte', 'prod_tea', 'prod_lemonade', 'prod_mocha', 'nope', 'prod_latte']);
    expect(resolutions.map(({ id, orderable, block }) => ({ id, orderable, block }))).toEqual([
      { id: 'prod_latte', orderable: true, block: null },
      { id: 'prod_tea', orderable: false, block: 'draft' },
      { id: 'prod_lemonade', orderable: false, block: 'unavailable' },
      { id: 'prod_mocha', orderable: false, block: 'archived' },
      { id: 'nope', orderable: false, block: 'not_found' },
    ]);
    expect(resolutions[0]?.product?.optionGroups[0]?.options).toHaveLength(2);
    expect(resolutions[4]?.product).toBeNull();
  });
});
