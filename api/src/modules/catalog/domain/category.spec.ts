import { describe, expect, it } from 'vitest';
import { categoryDraftIssues, categoryOrderIssues, createCategoryId, type Category } from './category.js';

const at = new Date('2026-11-01T12:00:00Z');
const category = (id: string, name: string, position: number): Category => ({
  id,
  name,
  description: '',
  visible: true,
  position,
  createdAt: at,
  updatedAt: at,
});
const categories = [category('cafes', 'Cafés', 0), category('bebidas', 'Bebidas', 1)];

describe('category rules', () => {
  it('derives a slug id from the name, suffixed when taken', () => {
    expect(createCategoryId('  Tostadas Dulces ', categories)).toBe('tostadas-dulces');
    expect(createCategoryId('CAFÉS', categories)).toBe('cafes-2');
    expect(createCategoryId('¡¡!!', categories)).toBe('categoria');
  });

  it('requires a unique name up to 30 characters and a description up to 140', () => {
    const draft = { name: 'Postres', description: '', visible: true };
    expect(categoryDraftIssues(draft, categories, null)).toEqual([]);
    expect(categoryDraftIssues({ ...draft, name: '  ' }, categories, null)).toEqual([{ path: 'name', code: 'required' }]);
    expect(categoryDraftIssues({ ...draft, name: 'x'.repeat(31) }, categories, null)).toEqual([{ path: 'name', code: 'too_long' }]);
    expect(categoryDraftIssues({ ...draft, name: 'cafes' }, categories, null)).toEqual([{ path: 'name', code: 'duplicate' }]);
    expect(categoryDraftIssues({ ...draft, name: 'cafes' }, categories, 'cafes')).toEqual([]);
    expect(categoryDraftIssues({ ...draft, description: 'x'.repeat(141) }, categories, null)).toEqual([
      { path: 'description', code: 'too_long' },
    ]);
  });

  it('accepts only an order that lists every category once', () => {
    expect(categoryOrderIssues(['bebidas', 'cafes'], categories)).toEqual([]);
    for (const ids of [['bebidas'], ['bebidas', 'bebidas'], ['bebidas', 'cafes', 'nope']]) {
      expect(categoryOrderIssues(ids, categories)).toEqual([{ path: 'ids', code: 'not_a_permutation' }]);
    }
  });
});
