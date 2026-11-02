import { describe, expect, it } from 'vitest';
import {
  createProductSku,
  orderBlock,
  productDraftIssues,
  skuPrefixFor,
  type OptionGroupDraft,
  type Product,
  type ProductDraft,
} from './product.js';

const at = new Date('2026-11-01T12:00:00Z');

const milk: OptionGroupDraft = {
  title: 'Leche',
  selection: 'single',
  required: true,
  defaultOption: 'Entera',
  options: [
    { name: 'Entera', priceDelta: 0 },
    { name: 'Avena', priceDelta: 900 },
  ],
};

const draft: ProductDraft = {
  name: 'Latte',
  description: 'Espresso con leche',
  price: 4200,
  categoryId: 'cafes',
  publication: 'published',
  available: true,
  allowCustomerNotes: true,
  optionGroups: [milk],
};

const existing: Product = {
  ...draft,
  id: 'prod_1',
  sku: 'CAF-001',
  archived: false,
  position: 1,
  version: 1,
  optionGroups: [
    {
      id: 'grp_1',
      title: 'Leche',
      selection: 'single',
      required: true,
      max: 1,
      defaultOptionId: 'opt_1',
      options: [{ id: 'opt_1', name: 'Entera', priceDelta: 0 }],
    },
  ],
  createdAt: at,
  updatedAt: at,
};

const context = { categoryIds: ['cafes', 'bebidas'], others: [] as Product[], current: null };

describe('product rules', () => {
  it('accepts a valid draft', () => {
    expect(productDraftIssues(draft, context)).toEqual([]);
  });

  it('checks name, description, price and category', () => {
    const issues = productDraftIssues(
      { ...draft, name: 'latte ', description: 'x'.repeat(141), price: 0, categoryId: 'nope' },
      { ...context, others: [existing] },
    );
    expect(issues).toEqual([
      { path: 'name', code: 'duplicate' },
      { path: 'description', code: 'too_long' },
      { path: 'price', code: 'out_of_range' },
      { path: 'categoryId', code: 'unknown_category' },
    ]);
    expect(productDraftIssues({ ...draft, price: 12.5 }, context)).toEqual([{ path: 'price', code: 'out_of_range' }]);
    expect(productDraftIssues({ ...draft, name: 'Latte' }, { ...context, others: [{ ...existing, archived: true }] })).toEqual([]);
  });

  it('checks the sku format and uniqueness, archived products included', () => {
    expect(productDraftIssues({ ...draft, sku: 'caf 1' }, context)).toEqual([{ path: 'sku', code: 'invalid_format' }]);
    expect(productDraftIssues({ ...draft, sku: 'CAF-001' }, { ...context, others: [{ ...existing, archived: true, name: 'Otro' }] })).toEqual([
      { path: 'sku', code: 'duplicate' },
    ]);
  });

  it('enforces the option group rules', () => {
    const group = (overrides: Partial<OptionGroupDraft>): ProductDraft => ({ ...draft, optionGroups: [{ ...milk, ...overrides }] });
    expect(productDraftIssues(group({ max: 2 }), context)).toEqual([{ path: 'optionGroups.0.max', code: 'out_of_range' }]);
    expect(productDraftIssues(group({ selection: 'multiple', defaultOption: null, max: 0 }), context)).toEqual([
      { path: 'optionGroups.0.max', code: 'out_of_range' },
    ]);
    expect(productDraftIssues(group({ defaultOption: 'Soja' }), context)).toEqual([
      { path: 'optionGroups.0.defaultOption', code: 'unknown_option' },
    ]);
    expect(productDraftIssues(group({ selection: 'multiple' }), context)).toEqual([
      { path: 'optionGroups.0.defaultOption', code: 'not_allowed' },
    ]);
    expect(productDraftIssues(group({ options: [], defaultOption: null }), context)).toEqual([
      { path: 'optionGroups.0.options', code: 'required' },
    ]);
    expect(
      productDraftIssues(group({ options: [{ name: 'Entera', priceDelta: 0 }, { name: ' ENTERA', priceDelta: -1 }] }), context),
    ).toEqual([
      { path: 'optionGroups.0.options.1.name', code: 'duplicate' },
      { path: 'optionGroups.0.options.1.priceDelta', code: 'out_of_range' },
    ]);
    expect(productDraftIssues({ ...draft, optionGroups: [milk, { ...milk, title: 'leche' }] }, context)).toEqual([
      { path: 'optionGroups.1.title', code: 'duplicate' },
    ]);
  });

  it('keeps only group and option ids of the product being edited', () => {
    const edited: ProductDraft = {
      ...draft,
      optionGroups: [{ ...milk, id: 'grp_1', options: [{ id: 'opt_1', name: 'Entera', priceDelta: 0 }, { id: 'opt_9', name: 'Avena', priceDelta: 0 }] }],
    };
    expect(productDraftIssues(edited, { ...context, current: existing })).toEqual([
      { path: 'optionGroups.0.options.1.id', code: 'unknown_option' },
    ]);
    expect(productDraftIssues({ ...edited, optionGroups: [{ ...milk, id: 'grp_1' }] }, context)).toEqual([
      { path: 'optionGroups.0.id', code: 'unknown_group' },
    ]);
  });

  it('generates the next sku of the category prefix', () => {
    expect(skuPrefixFor('cafes')).toBe('CAF');
    expect(skuPrefixFor('te')).toBe('TEX');
    expect(createProductSku('cafes', ['CAF-001', 'CAF-017', 'BEB-020', 'CAF-X'])).toBe('CAF-018');
    expect(createProductSku('bebidas', [])).toBe('BEB-001');
  });

  it('tells why a product cannot be ordered', () => {
    expect(orderBlock(existing)).toBeNull();
    expect(orderBlock({ ...existing, archived: true })).toBe('archived');
    expect(orderBlock({ ...existing, publication: 'draft' })).toBe('draft');
    expect(orderBlock({ ...existing, available: false })).toBe('unavailable');
  });
});
