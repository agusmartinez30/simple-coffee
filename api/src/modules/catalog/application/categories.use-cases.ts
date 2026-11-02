import {
  categoryDraftIssues,
  categoryOrderIssues,
  createCategoryId,
  normalizeCategoryDraft,
  type Category,
  type CategoryDraft,
} from '../domain/category.js';
import { CategoryHasProductsError, InvalidCategoryError } from '../domain/catalog-errors.js';
import { findCategory, type CatalogDeps } from './catalog-deps.js';

/** Every category mutation answers the full list by position, as the admin categories screen shows it. */

export class ListCategories {
  constructor(private readonly deps: CatalogDeps) {}

  execute(): Promise<Category[]> {
    return this.deps.catalog.listCategories();
  }
}

function validDraft(categories: readonly Category[], input: CategoryDraft, editingId: string | null): CategoryDraft {
  const issues = categoryDraftIssues(input, categories, editingId);
  if (issues.length > 0) throw new InvalidCategoryError(issues);
  return normalizeCategoryDraft(input);
}

export type NewCategory = Pick<CategoryDraft, 'name'> & Partial<CategoryDraft>;

/** Adds a visible category at the end, with a slug id of its name. */
export class CreateCategory {
  constructor(private readonly deps: CatalogDeps) {}

  async execute(input: NewCategory): Promise<Category[]> {
    const categories = await this.deps.catalog.listCategories();
    const draft = validDraft(categories, { description: '', visible: true, ...input }, null);
    const now = this.deps.clock.now();
    await this.deps.catalog.saveCategory({
      id: createCategoryId(draft.name, categories),
      ...draft,
      position: Math.max(-1, ...categories.map((category) => category.position)) + 1,
      createdAt: now,
      updatedAt: now,
    });
    return this.deps.catalog.listCategories();
  }
}

/** Saves the given fields; the id (slug of the first name) and the position are kept. */
export class UpdateCategory {
  constructor(private readonly deps: CatalogDeps) {}

  async execute(id: string, input: Partial<CategoryDraft>): Promise<Category[]> {
    const categories = await this.deps.catalog.listCategories();
    const current = findCategory(categories, id);
    const draft = validDraft(categories, { name: current.name, description: current.description, visible: current.visible, ...input }, id);
    await this.deps.catalog.saveCategory({ ...current, ...draft, updatedAt: this.deps.clock.now() });
    return this.deps.catalog.listCategories();
  }
}

/** Deletes a category without products; archived products keep their category, so they count too. */
export class DeleteCategory {
  constructor(private readonly deps: CatalogDeps) {}

  async execute(id: string): Promise<Category[]> {
    findCategory(await this.deps.catalog.listCategories(), id);
    const productCount = await this.deps.catalog.countProducts(id);
    if (productCount > 0) throw new CategoryHasProductsError(productCount);
    await this.deps.catalog.deleteCategory(id);
    return this.deps.catalog.listCategories();
  }
}

/** Applies a new order given as the full list of category ids. */
export class ReorderCategories {
  constructor(private readonly deps: CatalogDeps) {}

  async execute(ids: readonly string[]): Promise<Category[]> {
    const issues = categoryOrderIssues(ids, await this.deps.catalog.listCategories());
    if (issues.length > 0) throw new InvalidCategoryError(issues);
    await this.deps.catalog.saveCategoryOrder(ids);
    return this.deps.catalog.listCategories();
  }
}
