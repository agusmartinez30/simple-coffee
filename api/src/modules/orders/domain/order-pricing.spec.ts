import { describe, expect, it } from 'vitest';
import { InvalidOrderError, ProductNotOrderableError, TableDisabledError } from './orders-errors.js';
import { prepareOrder, type OrderDraft, type OrderTable, type PricingProduct, type ProductLookup } from './order-pricing.js';

const latte: PricingProduct = {
  id: 'prod_latte',
  sku: 'CAF-001',
  name: 'Latte',
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
};

const toast: PricingProduct = {
  id: 'prod_toast',
  sku: 'TOS-001',
  name: 'Tostado',
  price: 5000,
  allowCustomerNotes: false,
  optionGroups: [
    {
      id: 'grp_bread',
      title: 'Pan',
      selection: 'single',
      required: true,
      max: 1,
      defaultOptionId: null,
      options: [
        { id: 'opt_white', name: 'Blanco', priceDelta: 0 },
        { id: 'opt_seeds', name: 'Semillas', priceDelta: 300 },
      ],
    },
    {
      id: 'grp_extras',
      title: 'Extras',
      selection: 'multiple',
      required: false,
      max: 2,
      defaultOptionId: null,
      options: [
        { id: 'opt_avocado', name: 'Palta', priceDelta: 1200 },
        { id: 'opt_egg', name: 'Huevo', priceDelta: 800 },
        { id: 'opt_cheese', name: 'Queso', priceDelta: 600 },
      ],
    },
  ],
};

const lookups: ProductLookup[] = [
  { id: latte.id, product: latte, block: null },
  { id: toast.id, product: toast, block: null },
];

const table: OrderTable = { number: 7, label: 'Mesa 07', spaceName: 'Salón', enabled: true };

function prepare(draft: Partial<OrderDraft>, context: { table?: OrderTable | null; products?: ProductLookup[] } = {}) {
  return prepareOrder(
    { tableNumber: 7, lines: [{ productId: 'prod_latte', quantity: 1 }], ...draft },
    { table: context.table === undefined ? table : context.table, products: context.products ?? lookups },
  );
}

function issuesOf(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    if (error instanceof InvalidOrderError) return error.issues;
    throw error;
  }
  throw new Error('Expected an invalid order');
}

describe('prepareOrder', () => {
  it('prices lines from the catalog, applying the default of a required group', () => {
    const order = prepare({
      lines: [
        { productId: 'prod_latte', quantity: 2, note: ' Bien caliente ' },
        { productId: 'prod_toast', quantity: 1, optionIds: ['opt_egg', 'opt_seeds', 'opt_avocado'] },
      ],
    });
    expect(order).toEqual({
      tableNumber: 7,
      tableLabel: 'Mesa 07',
      spaceName: 'Salón',
      customerName: 'Mesa 07',
      note: null,
      total: 2 * 4200 + (5000 + 300 + 1200 + 800),
      items: [
        {
          productId: 'prod_latte',
          productName: 'Latte',
          sku: 'CAF-001',
          quantity: 2,
          unitPrice: 4200,
          note: 'Bien caliente',
          options: [{ groupTitle: 'Leche', optionName: 'Entera', priceDelta: 0 }],
        },
        {
          productId: 'prod_toast',
          productName: 'Tostado',
          sku: 'TOS-001',
          quantity: 1,
          unitPrice: 7300,
          note: null,
          // Group order first, then option order within the group.
          options: [
            { groupTitle: 'Pan', optionName: 'Semillas', priceDelta: 300 },
            { groupTitle: 'Extras', optionName: 'Palta', priceDelta: 1200 },
            { groupTitle: 'Extras', optionName: 'Huevo', priceDelta: 800 },
          ],
        },
      ],
    });
  });

  it('keeps a chosen option over the default and trims the customer name and note', () => {
    const order = prepare({
      customerName: '  Lucía  ',
      note: ' Sin apuro ',
      lines: [{ productId: 'prod_latte', quantity: 1, optionIds: ['opt_oat'] }],
    });
    expect(order).toMatchObject({ customerName: 'Lucía', note: 'Sin apuro', total: 5100 });
    expect(prepare({ customerName: '   ', note: '  ' })).toMatchObject({ customerName: 'Mesa 07', note: null });
  });

  it('checks the order fields', () => {
    expect(issuesOf(() => prepare({ lines: [] }))).toEqual([{ path: 'lines', code: 'required' }]);
    expect(
      issuesOf(() =>
        prepare({
          customerName: 'x'.repeat(41),
          note: 'x'.repeat(141),
          lines: [
            { productId: 'prod_latte', quantity: 0 },
            { productId: 'prod_latte', quantity: 100 },
            { productId: 'prod_latte', quantity: 1.5 },
            { productId: 'nope', quantity: 1 },
          ],
        }),
      ),
    ).toEqual([
      { path: 'customerName', code: 'too_long' },
      { path: 'note', code: 'too_long' },
      { path: 'lines.0.quantity', code: 'out_of_range' },
      { path: 'lines.1.quantity', code: 'out_of_range' },
      { path: 'lines.2.quantity', code: 'out_of_range' },
      { path: 'lines.3.productId', code: 'unknown_product' },
    ]);
    const many = Array.from({ length: 51 }, () => ({ productId: 'prod_latte', quantity: 1 }));
    expect(issuesOf(() => prepare({ lines: many }))).toEqual([{ path: 'lines', code: 'too_many' }]);
  });

  it('requires an existing table', () => {
    expect(issuesOf(() => prepare({}, { table: null }))).toEqual([{ path: 'tableNumber', code: 'unknown_table' }]);
    expect(() => prepare({}, { table: { ...table, enabled: false } })).toThrow(TableDisabledError);
  });

  it('enforces the option group rules', () => {
    expect(
      issuesOf(() =>
        prepare({
          lines: [
            { productId: 'prod_latte', quantity: 1, optionIds: ['opt_whole', 'opt_oat'] },
            { productId: 'prod_toast', quantity: 1 },
            { productId: 'prod_toast', quantity: 1, optionIds: ['opt_white', 'opt_avocado', 'opt_egg', 'opt_cheese'] },
            { productId: 'prod_toast', quantity: 1, optionIds: ['opt_white', 'opt_oat', 'opt_white'] },
          ],
        }),
      ),
    ).toEqual([
      { path: 'lines.0.optionIds', code: 'too_many_options', groupId: 'grp_milk' },
      { path: 'lines.1.optionIds', code: 'missing_required_group', groupId: 'grp_bread' },
      { path: 'lines.2.optionIds', code: 'too_many_options', groupId: 'grp_extras' },
      { path: 'lines.3.optionIds.1', code: 'unknown_option' },
      { path: 'lines.3.optionIds.2', code: 'duplicate_option' },
    ]);
  });

  it('allows item notes only on products that accept them', () => {
    expect(
      issuesOf(() =>
        prepare({
          lines: [
            { productId: 'prod_toast', quantity: 1, optionIds: ['opt_white'], note: 'Sin sal' },
            { productId: 'prod_latte', quantity: 1, note: 'x'.repeat(141) },
          ],
        }),
      ),
    ).toEqual([
      { path: 'lines.0.note', code: 'not_allowed' },
      { path: 'lines.1.note', code: 'too_long' },
    ]);
    // A blank note is no note.
    expect(prepare({ lines: [{ productId: 'prod_toast', quantity: 1, optionIds: ['opt_white'], note: '  ' }] }).items[0]?.note).toBeNull();
  });

  it('refuses products that cannot be ordered, after the request is valid', () => {
    const blocked: ProductLookup[] = [{ id: latte.id, product: latte, block: 'unavailable' }];
    expect(() => prepare({}, { products: blocked })).toThrow(new ProductNotOrderableError('prod_latte', 'unavailable'));
    expect(issuesOf(() => prepare({ lines: [] }, { products: blocked }))).toEqual([{ path: 'lines', code: 'required' }]);
  });
});
