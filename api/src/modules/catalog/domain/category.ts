import { normalizeName, uniqueSlug } from './slug.js';

/** Menu sections (admin 08C "Categorías"). Products are listed by category position, then by their own. */

export const CATEGORY_NAME_MAX_LENGTH = 30;
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 140;

export interface Category {
  /** Slug of the first name ("cafes"); it never changes on rename. */
  id: string;
  name: string;
  /** Empty when unset. */
  description: string;
  /** Hidden categories stay manageable but are left out of the customer menu. */
  visible: boolean;
  /** Display order, from 0. */
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryDraft {
  name: string;
  description: string;
  visible: boolean;
}

export type CategoryIssue =
  | { path: 'name'; code: 'required' | 'too_long' | 'duplicate' }
  | { path: 'description'; code: 'too_long' }
  | { path: 'ids'; code: 'not_a_permutation' };

export function normalizeCategoryDraft(draft: CategoryDraft): CategoryDraft {
  return { ...draft, name: draft.name.trim(), description: draft.description.trim() };
}

/** Unique (ignoring case, spaces and accents), non-empty name of up to 30 characters; description up to 140. */
export function categoryDraftIssues(draft: CategoryDraft, categories: readonly Category[], editingId: string | null): CategoryIssue[] {
  const issues: CategoryIssue[] = [];
  const name = normalizeName(draft.name);
  if (name === '') issues.push({ path: 'name', code: 'required' });
  else if (draft.name.trim().length > CATEGORY_NAME_MAX_LENGTH) issues.push({ path: 'name', code: 'too_long' });
  else if (categories.some((category) => category.id !== editingId && normalizeName(category.name) === name)) {
    issues.push({ path: 'name', code: 'duplicate' });
  }
  if (draft.description.trim().length > CATEGORY_DESCRIPTION_MAX_LENGTH) issues.push({ path: 'description', code: 'too_long' });
  return issues;
}

/** Slug of the name, suffixed when another category already uses it. */
export function createCategoryId(name: string, categories: readonly Category[]): string {
  return uniqueSlug(
    name,
    categories.map((category) => category.id),
    'categoria',
  );
}

/** A new order must list every current category exactly once. */
export function categoryOrderIssues(ids: readonly string[], categories: readonly Category[]): CategoryIssue[] {
  const current = new Set(categories.map((category) => category.id));
  const permutation = ids.length === current.size && new Set(ids).size === ids.length && ids.every((id) => current.has(id));
  return permutation ? [] : [{ path: 'ids', code: 'not_a_permutation' }];
}
